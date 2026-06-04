from typing import List, Dict, Any
from schemas.resume import RankedCandidate, AnalysisResultOut
from utils.logger import app_logger


def rank_candidates(analysis_results: List[AnalysisResultOut]) -> List[RankedCandidate]:
    """
    Sort multiple resume analysis results by total_score descending
    and return a ranked list.
    """
    app_logger.info(f"Ranking {len(analysis_results)} candidates")

    sorted_results = sorted(
        analysis_results,
        key=lambda r: r.total_score,
        reverse=True
    )

    ranked = []
    for rank_pos, result in enumerate(sorted_results, start=1):
        ranked.append(
            RankedCandidate(
                rank=rank_pos,
                resume_id=result.resume_id,
                filename=result.resume_filename or f"resume_{result.resume_id}",
                candidate_name=result.candidate_name,
                total_score=result.total_score,
                skills_score=result.skills_score,
                experience_score=result.experience_score,
                education_score=result.education_score,
                match_summary=result.match_summary,
            )
        )

    app_logger.info(
        f"Rankings: " + " | ".join(
            f"#{r.rank} {r.candidate_name or r.filename} ({r.total_score:.1f})"
            for r in ranked[:5]
        )
    )
    return ranked


def summarize_jd(jd_text: str, max_length: int = 200) -> str:
    """Return a brief summary of the JD for display purposes."""
    lines = [l.strip() for l in jd_text.split("\n") if l.strip()]
    summary = " ".join(lines[:3])
    return summary[:max_length] + "..." if len(summary) > max_length else summary
