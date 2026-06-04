from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from models.resume import Resume
from models.user import User
from schemas.resume import ResumeOut
from services.parser import parse_resume
from services.extractor import extract_structured_data
from services.rag import index_resume
from utils.jwt import verify_token
from utils.logger import app_logger

router = APIRouter(prefix="/resume", tags=["Resume"])
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


@router.post(
    "/upload",
    response_model=ResumeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a single resume (PDF or DOCX)"
)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and parse a single resume. Extracts structured data via Claude."""
    raw_text, file_type = await parse_resume(file)

    # Extract structured fields via Claude
    parsed_data = await extract_structured_data(raw_text)

    # Compute file size
    content_length = file.size or len(raw_text.encode())
    file_size_kb = content_length / 1024

    # Persist to DB
    resume = Resume(
        user_id=current_user.id,
        filename=file.filename,
        file_type=file_type,
        raw_text=raw_text,
        parsed_data=parsed_data.model_dump(),
        file_size_kb=round(file_size_kb, 2)
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # Index in ChromaDB for RAG (bonus, non-blocking)
    try:
        await index_resume(
            resume.id, raw_text,
            metadata={"user_id": str(current_user.id), "filename": file.filename}
        )
    except Exception as e:
        app_logger.warning(f"RAG indexing failed (non-critical): {e}")

    app_logger.info(f"Resume uploaded: id={resume.id}, user={current_user.email}, file={file.filename}")
    return resume


@router.post(
    "/upload/batch",
    response_model=List[ResumeOut],
    status_code=status.HTTP_201_CREATED,
    summary="Upload multiple resumes at once"
)
async def upload_multiple_resumes(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and parse up to 10 resumes simultaneously."""
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 resumes per batch upload"
        )

    results = []
    errors = []

    for file in files:
        try:
            raw_text, file_type = await parse_resume(file)
            parsed_data = await extract_structured_data(raw_text)

            resume = Resume(
                user_id=current_user.id,
                filename=file.filename,
                file_type=file_type,
                raw_text=raw_text,
                parsed_data=parsed_data.model_dump(),
                file_size_kb=round((file.size or len(raw_text.encode())) / 1024, 2)
            )
            db.add(resume)
            db.flush()  # Get ID without committing yet

            try:
                await index_resume(resume.id, raw_text)
            except Exception:
                pass

            results.append(resume)

        except HTTPException as e:
            errors.append({"filename": file.filename, "error": e.detail})
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})

    db.commit()
    for r in results:
        db.refresh(r)

    if errors:
        app_logger.warning(f"Batch upload completed with {len(errors)} errors: {errors}")

    app_logger.info(f"Batch upload: {len(results)} succeeded, {len(errors)} failed")
    return results


@router.get(
    "/",
    response_model=List[ResumeOut],
    summary="List all resumes for current user"
)
async def list_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return all resumes belonging to the current user."""
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    return resumes


@router.get(
    "/{resume_id}",
    response_model=ResumeOut,
    summary="Get a specific resume"
)
async def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch a single resume by ID."""
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a resume and all its analysis results."""
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    db.delete(resume)
    db.commit()
    app_logger.info(f"Resume {resume_id} deleted by user {current_user.email}")