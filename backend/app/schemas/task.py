from datetime import datetime

from pydantic import BaseModel


class TaskSummaryResponse(BaseModel):
    task_code: str
    task_type: str
    title: str
    detail: str
    status: str
    error_message: str | None = None
    created_at: datetime
    output_path: str | None = None
    action_path: str | None = None


class TaskDetailResponse(TaskSummaryResponse):
    source_code: str
    source_name: str
    input_payload: dict | None = None
    instruct: str | None = None
    reference_text: str | None = None