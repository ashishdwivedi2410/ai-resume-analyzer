import anthropic
import json
from typing import Dict, Any
from config import get_settings
from services.embedder import (
    generate_embedding, cosine_similarity, build_resume_section_text
)
from schemas.resume import ParsedResumeData, SectionScores
from utils.logger import app_logger

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

# Weights for overall score
SECTION_WEIGHTS = {
    "skills": 0.40,
    "experience": 0.35,
    "education": 0.25,
}

SCORING_SYSTEM_PROMPT = """You are a technical recruiter AI. Given a resume section and a job description, 
score how well the candidate's background matches the job requirements.

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "score": <number 0-100>,
  "matched_items": ["item1", "item2"],
  "missing_items": ["item1", "item2"],
  "reasoning": "Brief 1-2 sentence reasoning"
}

Scoring guidelines:
- 90-100: Exceptional match, exceeds requirements
- 70-89: Strong match, meets most requirements  
- 50-69: Moderate match, meets some requirements
- 30-49: Weak match, significant gaps
- 0-29: Poor match, major skill gaps
"""


async def compute_section_scores(
    parsed_data: ParsedResumeData,
    jd_text: str
) -> SectionScores:
    """
    Compute section-wise scores using a hybrid of:
    1. Embedding cosine similarity (fast, objective)
    2. Claude LLM scoring (nuanced, contextual)
    Final score = 0.4 * embedding_score + 0.6 * llm_score
    """
    app_logger.info("Computing section-wise scores")

    parsed_dict = parsed_data.model_dump()
    jd_embedding = generate_embedding(jd_text)

    section_scores = {}
    scoring_breakdown = {}

    for section in ["skills", "experience", "education"]:
        section_text = build_resume_section_text(parsed_dict, section)

        if not section_text.strip():
            # No content in this section
            section_scores[section] = 0.0
            scoring_breakdown[section] = {
                "embedding_score": 0.0,
                "llm_score": 0.0,
                "final_score": 0.0,
                "matched_items": [],
                "missing_items": [],
                "reasoning": "No content found in this section"
            }
            continue

        # 1. Embedding-based similarity
        section_embedding = generate_embedding(section_text)
        emb_score = cosine_similarity(section_embedding, jd_embedding)

        # 2. LLM-based scoring (Claude)
        llm_result = await _llm_score_section(section, section_text, jd_text)
        llm_score = llm_result.get("score", emb_score)

        # Hybrid score
        final_score = round(0.4 * emb_score + 0.6 * llm_score, 2)
        section_scores[section] = final_score

        scoring_breakdown[section] = {
            "embedding_score": round(emb_score, 2),
            "llm_score": round(llm_score, 2),
            "final_score": final_score,
            "matched_items": llm_result.get("matched_items", []),
            "missing_items": llm_result.get("missing_items", []),
            "reasoning": llm_result.get("reasoning", "")
        }

        app_logger.debug(f"Section '{section}': emb={emb_score:.1f}, llm={llm_score:.1f}, final={final_score:.1f}")

    # Weighted total score
    total = (
        section_scores.get("skills", 0) * SECTION_WEIGHTS["skills"] +
        section_scores.get("experience", 0) * SECTION_WEIGHTS["experience"] +
        section_scores.get("education", 0) * SECTION_WEIGHTS["education"]
    )
    total = round(total, 2)

    app_logger.info(f"Total score: {total:.1f} | "
                    f"Skills: {section_scores.get('skills', 0):.1f} | "
                    f"Exp: {section_scores.get('experience', 0):.1f} | "
                    f"Edu: {section_scores.get('education', 0):.1f}")

    return SectionScores(
        skills_score=section_scores.get("skills", 0),
        experience_score=section_scores.get("experience", 0),
        education_score=section_scores.get("education", 0),
        total_score=total,
        scoring_breakdown=scoring_breakdown
    )


async def _llm_score_section(section: str, section_text: str, jd_text: str) -> Dict[str, Any]:
    """Use Claude to score a specific resume section against the JD."""
    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=500,
            system=SCORING_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Section: {section.upper()}\n\n"
                        f"Resume {section}:\n{section_text}\n\n"
                        f"Job Description:\n{jd_text[:3000]}"
                    )
                }
            ]
        )

        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        return json.loads(raw)

    except Exception as e:
        app_logger.error(f"LLM scoring error for section '{section}': {e}")
        return {"score": 50.0, "matched_items": [], "missing_items": [], "reasoning": "Scoring unavailable"}
    