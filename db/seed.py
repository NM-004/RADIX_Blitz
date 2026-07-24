import asyncio
from prisma import Prisma

# Expectations for each role across 12 RADIX categories (level 1-10)
# Skill Categories: COD, DSA, OOD, APTI, COMM, AI, CLOUD, SQL, SWE, SYSD, NETW, OS
SEED_DATA = [
    {
        "company": "Google LLC",
        "roles": [
            {
                "title": "Software Engineer",
                "expectations": {
                    "COD": 9, "DSA": 9, "OOD": 8, "APTI": 8, "COMM": 7, "AI": 5,
                    "CLOUD": 6, "SQL": 6, "SWE": 8, "SYSD": 8, "NETW": 6, "OS": 7
                }
            },
            {
                "title": "Data Scientist",
                "expectations": {
                    "COD": 8, "DSA": 7, "OOD": 6, "APTI": 9, "COMM": 8, "AI": 9,
                    "CLOUD": 7, "SQL": 8, "SWE": 6, "SYSD": 6, "NETW": 4, "OS": 5
                }
            }
        ]
    },
    {
        "company": "Microsoft",
        "roles": [
            {
                "title": "Software Engineer",
                "expectations": {
                    "COD": 8, "DSA": 8, "OOD": 8, "APTI": 7, "COMM": 8, "AI": 6,
                    "CLOUD": 7, "SQL": 7, "SWE": 8, "SYSD": 8, "NETW": 7, "OS": 7
                }
            },
            {
                "title": "Data Analyst",
                "expectations": {
                    "COD": 6, "DSA": 5, "OOD": 5, "APTI": 8, "COMM": 8, "AI": 6,
                    "CLOUD": 6, "SQL": 8, "SWE": 6, "SYSD": 5, "NETW": 4, "OS": 4
                }
            }
        ]
    },
    {
        "company": "Oracle Financial Services Software",
        "roles": [
            {
                "title": "Associate Software Engineer",
                "expectations": {
                    "COD": 7, "DSA": 7, "OOD": 7, "APTI": 7, "COMM": 7, "AI": 4,
                    "CLOUD": 5, "SQL": 7, "SWE": 7, "SYSD": 6, "NETW": 5, "OS": 6
                }
            },
            {
                "title": "Application Support Analyst",
                "expectations": {
                    "COD": 5, "DSA": 4, "OOD": 5, "APTI": 6, "COMM": 8, "AI": 3,
                    "CLOUD": 6, "SQL": 7, "SWE": 6, "SYSD": 5, "NETW": 7, "OS": 7
                }
            }
        ]
    }
]

async def main():
    db = Prisma()
    print("Connecting to database...")
    await db.connect()
    
    print("Seeding database...")
    for item in SEED_DATA:
        # Create or update company
        company = await db.company.upsert(
            where={"name": item["company"]},
            data={
                "create": {"name": item["company"]},
                "update": {"name": item["company"]}
            }
        )
        print(f"Upserted Company: {company.name}")
        
        for r in item["roles"]:
            # Find if role already exists for company
            existing_roles = await db.role.find_many(
                where={
                    "companyId": company.id,
                    "title": r["title"]
                }
            )
            
            if existing_roles:
                role = existing_roles[0]
                print(f"  Role '{role.title}' already exists.")
            else:
                role = await db.role.create(
                    data={
                        "title": r["title"],
                        "companyId": company.id
                    }
                )
                print(f"  Created Role: {role.title}")
            
            # Seed skill expectations
            for cat_code, level in r["expectations"].items():
                await db.companyskillexpectation.upsert(
                    where={
                        "roleId_categoryCode": {
                            "roleId": role.id,
                            "categoryCode": cat_code
                        }
                    },
                    data={
                        "create": {
                            "roleId": role.id,
                            "categoryCode": cat_code,
                            "expectedLevel": level
                        },
                        "update": {
                            "expectedLevel": level
                        }
                    }
                )
            print(f"    Seeded 12 skill expectations for '{r['title']}'")
            
    print("Database seeding completed successfully.")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
