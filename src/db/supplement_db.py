from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

Base = declarative_base()

# Define Supplement table
class Supplement(Base):
    __tablename__ = 'supplements'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    tier = Column(String)
    cost = Column(Float)
    link = Column(String)
    image_path = Column(String)

# Define Schedule table for tracking when supplements are taken
class Schedule(Base):
    __tablename__ = 'schedules'
    id = Column(Integer, primary_key=True)
    supplement_id = Column(Integer, ForeignKey('supplements.id'))
    supplement = relationship("Supplement")
    date = Column(Date)
    amount = Column(Float)

# Set up the SQLite database
engine = create_engine('sqlite:///supplements.db')
Base.metadata.create_all(engine)

# Create a session to interact with the database
Session = sessionmaker(bind=engine)
session = Session()
