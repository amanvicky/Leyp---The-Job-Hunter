import { seed } from "@/lib/seed";
import { prisma } from "@/lib/prisma";

const result = await seed();
console.log(`Seeded ${result.themes} themes and ${result.settings} settings.`);
await prisma.$disconnect();
