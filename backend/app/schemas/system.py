from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str


class SummaryResponse(BaseModel):
    appName: str
    currentUser: str
    presetCount: int
    runtime: str
    defaultAdmin: str