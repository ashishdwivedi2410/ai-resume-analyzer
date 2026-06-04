import json
import anthropic
from typing import Dict, Any
from config import get_settings
from schemas.resume import ParsedResumeData, SectionScores
from utils.logger import app_logger

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

FEEDBACK_SYSTEM_PROMPT = """You are an expert career coach and technical recruiter. 
Analyze a candidate's resume against a job description and provide actionable feedback.

Return ONLY valid JSON — no markdown, no explanation:
{
  "match_summary": "2-3 sentence overall assessment of the candidate's fit",
  "strengths": [
    "Specific strength 1 with context",
    "Specific strength 2 with context",
    "Specific strength 3 with context"
  ],
  "improvements": [
    "Specific actionable improvement 1",
    "Specific actionable improvement 2", 
    "Specific actionable improvement 3"
  ]
}

Rules:
- Be specific, not generic (e.g. "You have 3 years in React which matches the JD requirement" not just "Good frontend skills")
- Improvements should be actionable (e.g. "Add AWS certification to match cloud requirements" not "Learn cloud")
- Provide 3-5 strengths and 3-5 improvements
- Keep match_summary honest and balanced
"""


async def generate_feedback(
    parsed_data: ParsedResumeData,
    jd_text: str,
    scores: SectionScores
) -> Dict[str, Any]:
    """
    Generate strengths, improvement suggestions, and a match summary
    using Claude based on resume content, JD, and computed scores.
    """
    app_logger.info("Generating feedback via Claude")

    # Build a compact resume summary for the prompt
    resume_summary = _build_resume_summary(parsed_data, scores)

    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=1000,
            system=FEEDBACK_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"RESUME SUMMARY:\n{resume_summary}\n\n"
                        f"MATCH SCORES:\n"
                        f"- Skills: {scores.skills_score:.0f}/100\n"
                        f"- Experience: {scores.experience_score:.0f}/100\n"
                        f"- Education: {scores.education_score:.0f}/100\n"
                        f"- Overall: {scores.total_score:.0f}/100\n\n"
                        f"JOB DESCRIPTION:\n{jd_text[:3000]}"
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

        result = json.loads(raw)
        app_logger.info(f"Feedback generated: {len(result.get('strengths', []))} strengths, "
                        f"{len(result.get('improvements', []))} improvements")
        return result

    except json.JSONDecodeError as e:
        app_logger.error(f"JSON parse error in feedback: {e}")
        return _default_feedback(scores)
    except Exception as e:
        app_logger.error(f"Feedback generation error: {e}")
        return _default_feedback(scores)


def _build_resume_summary(parsed_data: ParsedResumeData, scores: SectionScores) -> str:
    """Build a compact resume text for the feedback prompt."""
    parts = []

    if parsed_data.name:
        parts.append(f"Candidate: {parsed_data.name}")

    if parsed_data.skills:
        parts.append(f"Skills: {', '.join(parsed_data.skills[:20])}")

    if parsed_data.experience:
        exp_lines = []
        for exp in parsed_data.experience[:3]:
            exp_lines.append(f"- {exp.role} at {exp.company} ({exp.duration})")
        parts.append("Experience:\n" + "\n".join(exp_lines))

    if parsed_data.education:
        edu_lines = []
        for edu in parsed_data.education[:2]:
            edu_lines.append(f"- {edu.degree} in {edu.field} from {edu.institution}")
        parts.append("Education:\n" + "\n".join(edu_lines))

    return "\n\n".join(parts)


def _default_feedback(scores: SectionScores) -> Dict[str, Any]:
    """Fallback feedback when Claude is unavailable."""
    score = scores.total_score
    if score >= 70:
        summary = "The candidate shows a strong match for this role."
    elif score >= 50:
        summary = "The candidate is a moderate match with some gaps to address."
    else:
        summary = "The candidate may need significant upskilling for this role."

    return {
        "match_summary": summary,
        "strengths": ["Resume analysis completed", f"Overall match score: {score:.0f}/100"],
        "improvements": ["Detailed feedback unavailable", "Please review scores manually"]
    }
