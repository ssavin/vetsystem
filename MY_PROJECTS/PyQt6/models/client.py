from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

@dataclass
class Client:
    id: Optional[int] = None
    last_name: str = ""
    first_name: str = ""
    middle_name: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    status: str = "активный"
    notes: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    patients: List['Patient'] = None
    
    def __post_init__(self):
        if self.patients is None:
            self.patients = []
    
    @property
    def full_name(self):
        return f"{self.last_name} {self.first_name} {self.middle_name}".strip()
    
    def to_dict(self):
        return {
            'last_name': self.last_name,
            'first_name': self.first_name,
            'middle_name': self.middle_name,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'status': self.status,
            'notes': self.notes
        }