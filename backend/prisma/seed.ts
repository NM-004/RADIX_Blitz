import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RoleData {
  title: string;
  expectations: Record<string, number>;
}

interface CompanyData {
  company: string;
  roles: RoleData[];
}

const SEED_DATA: CompanyData[] = [
  {
    company: "Google LLC",
    roles: [
      {
        title: "Software Engineer",
        expectations: {
          COD: 9, DSA: 9, OOD: 8, APTI: 8, COMM: 7, AI: 5,
          CLOUD: 6, SQL: 6, SWE: 8, SYSD: 8, NETW: 6, OS: 7
        }
      },
      {
        title: "Data Scientist",
        expectations: {
          COD: 8, DSA: 7, OOD: 6, APTI: 9, COMM: 8, AI: 9,
          CLOUD: 7, SQL: 8, SWE: 6, SYSD: 6, NETW: 4, OS: 5
        }
      }
    ]
  },
  {
    company: "Microsoft",
    roles: [
      {
        title: "Software Engineer",
        expectations: {
          COD: 8, DSA: 8, OOD: 8, APTI: 7, COMM: 8, AI: 6,
          CLOUD: 7, SQL: 7, SWE: 8, SYSD: 8, NETW: 7, OS: 7
        }
      },
      {
        title: "Data Analyst",
        expectations: {
          COD: 6, DSA: 5, OOD: 5, APTI: 8, COMM: 8, AI: 6,
          CLOUD: 6, SQL: 8, SWE: 6, SYSD: 5, NETW: 4, OS: 4
        }
      }
    ]
  },
  {
    company: "Oracle Financial Services Software",
    roles: [
      {
        title: "Associate Software Engineer",
        expectations: {
          COD: 7, DSA: 7, OOD: 7, APTI: 7, COMM: 7, AI: 4,
          CLOUD: 5, SQL: 7, SWE: 7, SYSD: 6, NETW: 5, OS: 6
        }
      },
      {
        title: "Application Support Analyst",
        expectations: {
          COD: 5, DSA: 4, OOD: 5, APTI: 6, COMM: 8, AI: 3,
          CLOUD: 6, SQL: 7, SWE: 6, SYSD: 5, NETW: 7, OS: 7
        }
      }
    ]
  }
];

async function main() {
  console.log("Connecting database...");
  await prisma.$connect();
  
  console.log("Seeding companies and baseline skillsets...");
  for (const item of SEED_DATA) {
    // Create or update company
    const company = await prisma.company.upsert({
      where: { name: item.company },
      update: {},
      create: { name: item.company }
    });
    console.log(`Upserted Company: ${company.name}`);
    
    for (const r of item.roles) {
      // Find if role exists
      const existingRoles = await prisma.role.findMany({
        where: {
          companyId: company.id,
          title: r.title
        }
      });
      
      let role;
      if (existingRoles.length > 0) {
        role = existingRoles[0];
        console.log(`  Role '${role.title}' already exists.`);
      } else {
        role = await prisma.role.create({
          data: {
            title: r.title,
            companyId: company.id
          }
        });
        console.log(`  Created Role: {role.title}`);
      }
      
      // Upsert expectations
      for (const [catCode, level] of Object.entries(r.expectations)) {
        await prisma.companySkillExpectation.upsert({
          where: {
            roleId_categoryCode: {
              roleId: role.id,
              categoryCode: catCode
            }
          },
          update: {
            expectedLevel: level
          },
          create: {
            roleId: role.id,
            categoryCode: catCode,
            expectedLevel: level
          }
        });
      }
      console.log(`    Seeded expectations for role '${r.title}'`);
    }
  }
  
  console.log("Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during database seed execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
