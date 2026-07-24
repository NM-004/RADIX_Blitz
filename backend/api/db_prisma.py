import asyncio
from prisma import Prisma

prisma = Prisma()

async def get_db():
    if not prisma.is_connected():
        await prisma.connect()
    return prisma

# Utility to disconnect on shutdown
async def close_db():
    if prisma.is_connected():
        await prisma.disconnect()
