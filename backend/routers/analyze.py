from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from models.resume import Resume, AnalysisResult
from models.user import User
from schemas.resume import (
    AnalyzeRequest, BatchAnalyzeRequest,
    AnalysisResultOut, BatchAnalysisResponse, SectionScores
)
from services.scorer import compute_section_scores
from services.feedback import generate_feedback
from services.ranker import rank_candidates, summarize_jd
from utils.cache import make_cache_key, get_cached_result, set_cached_result
from utils.jwt import verify_token
from utils.logger import app_logger

router = APIRouter(prefix="/analyze", tags=["Analysis"])
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    payload = verify_token(credentials.credentials, token_type="access")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return user


# ── Core analysis pipeline ──────────────────────────────────────────────────

async def _run_analysis_pipeline(
    resume: Resume,
    jd_text: str,
    db: Session
) -> AnalysisResult:
    """
    Full pipeline: scores → feedback → persist → return AnalysisResult.
    Uses Redis cache to skip re-processing duplicate (resume, JD) pairs.
    """
    cache_key = make_cache_key(resume.raw_text or "", jd_text)

    # Check cache
    cached = get_cached_result(cache_key)
    if cached:
        app_logger.info(f"Cache HIT for resume {resume.id}")
        # Return existing DB record if found
        existing = db.query(AnalysisResult).filter(
            AnalysisResult.cache_key == cache_key
        ).first()
        if existing:
            return existing

    # Parse resume data
    from schemas.resume import ParsedResumeData
    parsed_data = ParsedResumeData(**(resume.parsed_data or {}))

    # Compute section-wise scores
    scores: SectionScores = await compute_section_scores(parsed_data, jd_text)

    # Generate feedback
    feedback = await generate_feedback(parsed_data, jd_text, scores)

    # Persist result
    result = AnalysisResult(
        resume_id=resume.id,
        jd_text=jd_text,
        cache_key=cache_key,
        skills_score=scores.skills_score,
        experience_score=scores.experience_score,
        education_score=scores.education_score,
        total_score=scores.total_score,
        strengths=feedback.get("strengths", []),
        improvements=feedback.get("improvements", []),
        match_summary=feedback.get("match_summary", ""),
        scoring_breakdown=scores.scoring_breakdown,
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    # Cache the result
    set_cached_result(cache_key, {"result_id": result.id, "total_score": result.total_score})

    return result


def _result_to_schema(result: AnalysisResult, resume: Resume) -> AnalysisResultOut:
    """Map ORM object to Pydantic response schema."""
    parsed = resume.parsed_data or {}
    return AnalysisResultOut(
        id=result.id,
        resume_id=result.resume_id,
        resume_filename=resume.filename,
        candidate_name=parsed.get("name"),
        skills_score=result.skills_score,
        experience_score=result.experience_score,
        education_score=result.education_score,
        total_score=result.total_score,
        strengths=result.strengths or [],
        improvements=result.improvements or [],
        match_summary=result.match_summary,
        scoring_breakdown=result.scoring_breakdown,
        created_at=result.created_at,
    )


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post(
    "/single",
    response_model=AnalysisResultOut,
    summary="Analyze a single resume against a Job Description"
)
async def analyze_single(
    payload: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Score and generate feedback for one resume vs one JD.
    Results are cached — repeated calls with same resume+JD are instant.
    """
    resume = db.query(Resume).filter(
        Resume.id == payload.resume_id,
        Resume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    if not resume.raw_text:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Resume has no parsed text. Please re-upload.")

    result = await _run_analysis_pipeline(resume, payload.jd_text, db)
    return _result_to_schema(result, resume)


@router.post(
    "/batch",
    response_model=BatchAnalysisResponse,
    summary="Analyze and rank multiple resumes against one Job Description"
)
async def analyze_batch(
    payload: BatchAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process multiple resumes simultaneously against one JD.
    Returns ranked candidates sorted by overall match score.
    """
    if not payload.resume_ids:
        raise HTTPException(status_code=400, detail="Provide at least one resume ID")

    resumes = db.query(Resume).filter(
        Resume.id.in_(payload.resume_ids),
        Resume.user_id == current_user.id
    ).all()

    if not resumes:
        raise HTTPException(status_code=404, detail="No resumes found")

    analysis_results = []
    for resume in resumes:
        try:
            result = await _run_analysis_pipeline(resume, payload.jd_text, db)
            analysis_results.append(_result_to_schema(result, resume))
        except Exception as e:
            app_logger.error(f"Analysis failed for resume {resume.id}: {e}")

    if not analysis_results:
        raise HTTPException(status_code=500, detail="All analyses failed")

    rankings = rank_candidates(analysis_results)

    return BatchAnalysisResponse(
        total_resumes=len(analysis_results),
        jd_summary=summarize_jd(payload.jd_text),
        rankings=rankings,
        analysis_details=analysis_results,
    )


@router.get(
    "/results/{result_id}",
    response_model=AnalysisResultOut,
    summary="Fetch a specific analysis result by ID"
)
async def get_result(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch a previously computed analysis result."""
    result = db.query(AnalysisResult).join(Resume).filter(
        AnalysisResult.id == result_id,
        Resume.user_id == current_user.id
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Analysis result not found")

    return _result_to_schema(result, result.resume)


@router.get(
    "/rankings",
    response_model=List[AnalysisResultOut],
    summary="Get all analysis results for current user, sorted by score"
)
async def get_all_rankings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return all analysis results for the user's resumes, sorted best-first."""
    results = (
        db.query(AnalysisResult)
        .join(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(AnalysisResult.total_score.desc())
        .all()
    )

    return [_result_to_schema(r, r.resume) for r in results]


@router.delete("/results/{result_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_result(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an analysis result."""
    result = db.query(AnalysisResult).join(Resume).filter(
        AnalysisResult.id == result_id,
        Resume.user_id == current_user.id
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    db.delete(result)
    db.commit()
    