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

const STATIC_PROFILES = [
  {
    name: "Rohan Verma",
    email: "rohan.verma@example.com",
    education: "B.Tech Computer Science, IIT Delhi",
    cvFile: "Rohan Verma.pdf",
    preferredRoles: ["Software Engineer", "Systems Engineer"],
    hackathons: ["Radix Talent Match Hackathon", "TechFest 2025"],
    certifications: ["AWS Certified Solutions Architect", "Oracle Certified Java SE"],
    internships: ["Software Engineer Intern, Microsoft"],
    skills: [
      { skillName: "Python coding and scripting", categoryCode: "COD", level: 8, confidence: "high", evidence: "Developed internal microservices using Python/FastAPI." },
      { skillName: "Algorithms and Complexities", categoryCode: "DSA", level: 8, confidence: "high", evidence: "Leetcode 300+ problems solved, specialized in dynamic programming." },
      { skillName: "Design Patterns & OOP", categoryCode: "OOD", level: 8, confidence: "high", evidence: "Implemented robust OOD architecture in microservices project." },
      { skillName: "Logical Reasoning", categoryCode: "APTI", level: 8, confidence: "medium", evidence: "Passed analytical aptitude rounds in internships." },
      { skillName: "Technical Writing", categoryCode: "COMM", level: 7, confidence: "high", evidence: "Presented technical projects to executive stakeholders." },
      { skillName: "Deep Learning (PyTorch)", categoryCode: "AI", level: 7, confidence: "medium", evidence: "Built classifier models using PyTorch during hackathons." },
      { skillName: "AWS Cloud Services", categoryCode: "CLOUD", level: 7, confidence: "high", evidence: "Deployed containerized apps via ECS and managed RDS." },
      { skillName: "PostgreSQL Databases", categoryCode: "SQL", level: 8, confidence: "high", evidence: "Designed schemas, optimized queries, and created indices." },
      { skillName: "Git & CI/CD Pipelines", categoryCode: "SWE", level: 8, confidence: "high", evidence: "Configured GitHub Actions for test suite automation." },
      { skillName: "Microservice System Architecture", categoryCode: "SYSD", level: 7, confidence: "medium", evidence: "Designed scalable backend systems utilizing Redis caching." },
      { skillName: "Protocols (HTTP/DNS)", categoryCode: "NETW", level: 6, confidence: "medium", evidence: "Implemented secure CORS and API routing protocols." },
      { skillName: "Linux Process Management", categoryCode: "OS", level: 7, confidence: "high", evidence: "Experienced in shell scripting and POSIX process threading." }
    ]
  },
  {
    name: "Ananya Rao",
    email: "ananya.rao@example.com",
    education: "M.S Data Science, IIIT Bangalore",
    cvFile: "Ananya Rao.pdf",
    preferredRoles: ["Data Scientist", "Data Analyst"],
    hackathons: ["DataHack 2025", "Kaggle Analytics Challenge"],
    certifications: ["Google Data Analytics Certificate", "TensorFlow Developer Certification"],
    internships: ["Data Analyst Intern, Google"],
    skills: [
      { skillName: "Scientific Python", categoryCode: "COD", level: 7, confidence: "high", evidence: "Experienced in pandas, numpy, and Jupyter notebooks." },
      { skillName: "Complex Search Algorithms", categoryCode: "DSA", level: 6, confidence: "medium", evidence: "Familiar with trees and graph search logic." },
      { skillName: "Data Design Patterns", categoryCode: "OOD", level: 6, confidence: "medium", evidence: "Implemented basic OOP inheritance models for data parsers." },
      { skillName: "Quantitative Math", categoryCode: "APTI", level: 8, confidence: "high", evidence: "Strong background in statistics and regression analysis." },
      { skillName: "Client Presentations", categoryCode: "COMM", level: 8, confidence: "high", evidence: "Presented business intelligence dashboards to client representatives." },
      { skillName: "Machine Learning models", categoryCode: "AI", level: 8, confidence: "high", evidence: "Implemented scikit-learn classifiers and TensorFlow regression." },
      { skillName: "GCP Data Warehouses", categoryCode: "CLOUD", level: 6, confidence: "medium", evidence: "Used BigQuery for processing massive datasets." },
      { skillName: "Complex SQL Queries", categoryCode: "SQL", level: 9, confidence: "high", evidence: "Expert in complex JOINs, window functions, and analytics queries." },
      { skillName: "Agile Development", categoryCode: "SWE", level: 7, confidence: "medium", evidence: "Active participant in sprint plannings and reviews." },
      { skillName: "Data Pipelines Architecture", categoryCode: "SYSD", level: 5, confidence: "medium", evidence: "Constructed simple ETL frameworks." },
      { skillName: "TCP/IP Networks", categoryCode: "NETW", level: 4, confidence: "low", evidence: "Basic understanding of client-server sockets." },
      { skillName: "OS Bash Scripting", categoryCode: "OS", level: 5, confidence: "medium", evidence: "Written cron jobs and automation scripts in Linux." }
    ]
  },
  {
    name: "Karthik Subramaniam",
    email: "karthik.subramaniam@example.com",
    education: "B.Tech Computer Science, NIT Trichy",
    cvFile: "Karthik Subramaniam.pdf",
    preferredRoles: ["Systems Engineer", "Software Engineer"],
    hackathons: ["CTF Cyber Challenge", "Linux Kernel Hackathon"],
    certifications: ["Linux Professional Institute Cert", "AWS DevOps Engineer"],
    internships: ["Systems Intern, RedHat"],
    skills: [
      { skillName: "C/C++ Systems Programming", categoryCode: "COD", level: 8, confidence: "high", evidence: "Written low-level socket libraries and systems tools in C++." },
      { skillName: "Data Structures", categoryCode: "DSA", level: 9, confidence: "high", evidence: "Thorough understanding of heaps, search trees, and custom graphs." },
      { skillName: "Systems Design Patterns", categoryCode: "OOD", level: 7, confidence: "high", evidence: "Used clean SOLID designs for network proxy components." },
      { skillName: "Logical puzzles", categoryCode: "APTI", level: 8, confidence: "medium", evidence: "Solved complex analytical puzzles in IT contests." },
      { skillName: "Collaborative Coding", categoryCode: "COMM", level: 6, confidence: "medium", evidence: "Participated in open-source kernel mail group discussions." },
      { skillName: "Neural Net Foundations", categoryCode: "AI", level: 4, confidence: "low", evidence: "Trained simple regression models in Jupyter." },
      { skillName: "Docker and Kubernetes", categoryCode: "CLOUD", level: 6, confidence: "medium", evidence: "Created Dockerfiles and managed local K8s test clusters." },
      { skillName: "Relational Queries", categoryCode: "SQL", level: 6, confidence: "medium", evidence: "Built relational models using MySQL." },
      { skillName: "Git and Code Refactoring", categoryCode: "SWE", level: 8, confidence: "high", evidence: "Managed complex git rebases, branches, and code reviews." },
      { skillName: "Distributed Systems Architecture", categoryCode: "SYSD", level: 8, confidence: "high", evidence: "Built custom load balancers and cache layers during internships." },
      { skillName: "TCP/IP, Routing & Sockets", categoryCode: "NETW", level: 8, confidence: "high", evidence: "Expert in sockets, firewalls, HTTP protocol details, and routing." },
      { skillName: "Linux Process & Kernel", categoryCode: "OS", level: 9, confidence: "high", evidence: "Deep knowledge of process signals, memory paging, and bash scripting." }
    ]
  },
  {
    name: "Priya Menon",
    email: "priya.menon@example.com",
    education: "B.Sc Information Technology, Mumbai University",
    cvFile: "Priya Menon.pdf",
    preferredRoles: ["Application Support Analyst", "Helpdesk Support Engineer"],
    hackathons: ["Solve For Tomorrow 2024"],
    certifications: ["CompTIA Network+", "ITIL Foundation Certificate"],
    internships: ["IT Support Trainee, Oracle"],
    skills: [
      { skillName: "Python & Shell Scripting", categoryCode: "COD", level: 5, confidence: "high", evidence: "Automated report creation using Python scripts." },
      { skillName: "Basic Algorithms", categoryCode: "DSA", level: 4, confidence: "medium", evidence: "Understands binary search and sorting procedures." },
      { skillName: "OOP Basics", categoryCode: "OOD", level: 5, confidence: "medium", evidence: "Understands basic classes and object instances." },
      { skillName: "Logic & Aptitude", categoryCode: "APTI", level: 6, confidence: "medium", evidence: "Cleared support analyst qualification tests." },
      { skillName: "Customer Communication", categoryCode: "COMM", level: 9, confidence: "high", evidence: "Managed technical ticket resolutions with overseas clients." },
      { skillName: "Chatbot APIs", categoryCode: "AI", level: 3, confidence: "low", evidence: "Configured simple QA bot answers." },
      { skillName: "Cloud Monitoring tools", categoryCode: "CLOUD", level: 6, confidence: "medium", evidence: "Monitored ECS service health metrics via AWS CloudWatch." },
      { skillName: "SQL Database Queries", categoryCode: "SQL", level: 7, confidence: "high", evidence: "Written diagnostic SQL SELECT statements and database updates." },
      { skillName: "Testing & ITIL support", categoryCode: "SWE", level: 6, confidence: "high", evidence: "Maintained version logs, resolved incident tickets, and reported bugs." },
      { skillName: "High Availability setups", categoryCode: "SYSD", level: 5, confidence: "medium", evidence: "Basic understanding of redundant server failovers." },
      { skillName: "DNS, VPN & Firewalls", categoryCode: "NETW", level: 7, confidence: "high", evidence: "Troubleshooted network ports, VPN access, and DNS mappings." },
      { skillName: "Windows & Linux Support", categoryCode: "OS", level: 6, confidence: "high", evidence: "Experienced in remote servers CLI administration and logs check." }
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
        console.log(`  Created Role: ${role.title}`);
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

  console.log("Seeding static Candidate Profiles...");
  for (const p of STATIC_PROFILES) {
    // Upsert candidate profile
    const profile = await prisma.candidateProfile.upsert({
      where: { email: p.email },
      update: {
        name: p.name,
        education: p.education,
        cvFile: p.cvFile,
        preferredRoles: p.preferredRoles,
        hackathons: p.hackathons,
        internships: p.internships,
        certifications: p.certifications
      },
      create: {
        name: p.name,
        email: p.email,
        education: p.education,
        cvFile: p.cvFile,
        preferredRoles: p.preferredRoles,
        hackathons: p.hackathons,
        internships: p.internships,
        certifications: p.certifications
      }
    });
    console.log(`Upserted Profile: ${profile.name}`);

    // Remove old skills first
    await prisma.candidateSkill.deleteMany({
      where: { profileId: profile.id }
    });

    // Seed skillsets
    for (const s of p.skills) {
      await prisma.candidateSkill.create({
        data: {
          profileId: profile.id,
          skillName: s.skillName,
          categoryCode: s.categoryCode,
          level: s.level,
          confidence: s.confidence,
          evidence: s.evidence
        }
      });
    }
    console.log(`  Seeded ${p.skills.length} skills for profile '${profile.name}'`);
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
