from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── Parsed Resume Data ──────────────────────────────────────────────────────

class ExperienceItem(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None


class EducationItem(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field: Optional[str] = None
    year: Optional[str] = None


class ParsedResumeData(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = []
    experience: List[ExperienceItem] = []
    education: List[EducationItem] = []
    summary: Optional[str] = None


# ── Resume Response ─────────────────────────────────────────────────────────

class ResumeOut(BaseModel):
    id: int
    filename: str
    file_type: str
    file_size_kb: Optional[float]
    parsed_data: Optional[ParsedResumeData]
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ── Section Scores ──────────────────────────────────────────────────────────

class SectionScores(BaseModel):
    skills_score: float
    experience_score: float
    education_score: float
    total_score: float
    scoring_breakdown: Optional[Dict[str, Any]] = None


# ── Analysis Request ────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    resume_id: int
    jd_text: str

    class Config:
        json_schema_extra = {
            "example": {
                "resume_id": 1,
                "jd_text": "We are looking for a Python backend developer with FastAPI, PostgreSQL..."
            }
        }


class BatchAnalyzeRequest(BaseModel):
    resume_ids: List[int]
    jd_text: str


# ── Analysis Response ───────────────────────────────────────────────────────

class AnalysisResultOut(BaseModel):
    id: int
    resume_id: int
    resume_filename: Optional[str] = None
    candidate_name: Optional[str] = None
    skills_score: float
    experience_score: float
    education_score: float
    total_score: float
    strengths: Optional[List[str]] = []
    improvements: Optional[List[str]] = []
    match_summary: Optional[str] = None
    scoring_breakdown: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RankedCandidate(BaseModel):
    rank: int
    resume_id: int
    filename: str
    candidate_name: Optional[str]
    total_score: float
    skills_score: float
    experience_score: float
    education_score: float
    match_summary: Optional[str]


class BatchAnalysisResponse(BaseModel):
    total_resumes: int
    jd_summary: str
    rankings: List[RankedCandidate]
    analysis_details: List[AnalysisResultOut]