from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)  # pdf or docx
    raw_text = Column(Text, nullable=True)
    parsed_data = Column(JSON, nullable=True)  # {name, email, skills, experience, education}
    file_size_kb = Column(Float, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="resumes")
    analysis_results = relationship("AnalysisResult", back_populates="resume", cascade="all, delete-orphan")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    jd_text = Column(Text, nullable=False)
    cache_key = Column(String(100), index=True, nullable=True)

    # Section-wise scores (0–100)
    skills_score = Column(Float, default=0.0)
    experience_score = Column(Float, default=0.0)
    education_score = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)

    # Feedback
    strengths = Column(JSON, nullable=True)       # List[str]
    improvements = Column(JSON, nullable=True)    # List[str]
    match_summary = Column(Text, nullable=True)

    # Metadata
    scoring_breakdown = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    resume = relationship("Resume", back_populates="analysis_results")