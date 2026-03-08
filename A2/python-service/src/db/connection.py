import asyncio
import asyncpg
from config.config import Config
import os

_pool = None


async def get_pool():
    """Get or create database connection pool (Bulkhead pattern)"""
    global _pool
    if _pool is None:
        config = Config()
        db_config = config.get_db_config()
        
        # Bulkhead: Create isolated connection pool for database
        _pool = await asyncpg.create_pool(
            host=db_config['host'],
            port=db_config['port'],
            database=db_config['database'],
            user=db_config['user'],
            password=db_config['password'],
            min_size=db_config['min_size'],
            max_size=db_config['max_size'],
        )
        print('Database connection pool established')
    return _pool


async def initialize_database():
    """Initialize database with migrations"""
    pool = await get_pool()
    
    try:
        # Read and execute migration files
        migrations_dir = os.path.join(os.path.dirname(__file__), '../migrations')
        
        with open(os.path.join(migrations_dir, '001_create_sensors.sql'), 'r') as f:
            migration1 = f.read()
            async with pool.acquire() as conn:
                await conn.execute(migration1)
        
        with open(os.path.join(migrations_dir, '002_seed_data.sql'), 'r') as f:
            migration2 = f.read()
            async with pool.acquire() as conn:
                await conn.execute(migration2)
        
        print('Database initialized successfully')
    except Exception as error:
        print(f'Database initialization failed: {error}')
        raise


async def close_pool():
    """Close database connection pool"""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
