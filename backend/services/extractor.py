import json
import anthropic
from config import get_settings
from schemas.resume import ParsedResumeData
from utils.logger import app_logger

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


EXTRACTION_SYSTEM_PROMPT = """You are an expert resume parser. Extract structured information 
from resumes and return ONLY valid JSON — no explanation, no markdown, no backticks.

Always return this exact JSON structure:
{
  "name": "Full name or null",
  "email": "email@example.com or null",
  "phone": "phone number or null",
  "location": "city, country or null",
  "summary": "professional summary or null",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "duration": "Jan 2020 - Dec 2022",
      "description": "Brief description of responsibilities"
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "year": "2020"
    }
  ]
}

Rules:
- Skills must be individual technologies, tools, or competencies (not sentences)
- If a field is missing, use null for strings or [] for arrays
- Deduplicate skills, normalize casing (e.g. "Python" not "python")
- Return ONLY JSON, nothing else
"""


async def extract_structured_data(raw_text: str) -> ParsedResumeData:
    """
    Use Claude to extract structured fields from raw resume text.
    Returns a ParsedResumeData object.
    """
    app_logger.info("Extracting structured data from resume via Claude")

    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=2000,
            system=EXTRACTION_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Extract structured data from this resume:\n\n{raw_text[:8000]}"
                }
            ]
        )

        raw_json = response.content[0].text.strip()

        # Strip markdown fences if present
        if raw_json.startswith("```"):
            raw_json = raw_json.split("```")[1]
            if raw_json.startswith("json"):
                raw_json = raw_json[4:]
            raw_json = raw_json.strip()

        parsed = json.loads(raw_json)
        result = ParsedResumeData(**parsed)
        app_logger.info(f"Extracted: name={result.name}, skills={len(result.skills)}, "
                        f"experience={len(result.experience)}, education={len(result.education)}")
        return result

    except json.JSONDecodeError as e:
        app_logger.error(f"JSON parse error from Claude extraction: {e}")
        return ParsedResumeData()  # Return empty rather than crash
    except anthropic.APIError as e:
        app_logger.error(f"Anthropic API error during extraction: {e}")
        raise
    except Exception as e:
        app_logger.error(f"Unexpected extraction error: {e}")
        return ParsedResumeData()
    