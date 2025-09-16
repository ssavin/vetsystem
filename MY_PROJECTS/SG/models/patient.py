from dataclasses import dataclass
from datetime import datetime, date
from typing import List, Optional

@dataclass
class Patient:
    id: Optional[int] = None
    name: str = ""
    species: str = ""
    breed: str = ""
    gender: str = "неизвестно"
    birth_date: Optional[date] = None
    age: Optional[int] = None
    color: str = ""
    special_marks: str = ""
    chip_number: str = ""
    is_neutered: bool = False
    allergies: str = ""
    chronic_diseases: str = ""
    status: str = "активный"
    notes: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    clients: List['Client'] = None
    
    def __post_init__(self):
        if self.clients is None:
            self.clients = []
        if self.birth_date and not self.age:
            self.calculate_age()
    
    def calculate_age(self):
        if self.birth_date:
            today = date.today()
            self.age = today.year - self.birth_date.year - (
                (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
            )
    
    def to_dict(self):
        return {
            'name': self.name,
            'species': self.species,
            'breed': self.breed,
            'gender': self.gender,
            'birth_date': self.birth_date,
            'age': self.age,
            'color': self.color,
            'special_marks': self.special_marks,
            'chip_number': self.chip_number,
            'is_neutered': self.is_neutered,
            'allergies': self.allergies,
            'chronic_diseases': self.chronic_diseases,
            'status': self.status,
            'notes': self.notes
        }