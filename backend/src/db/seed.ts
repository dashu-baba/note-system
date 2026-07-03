import "dotenv/config";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "./index.js";
import { agency, agencyUser, notes, user, workspace } from "./schema.js";

const AGENCY_USER_COUNT = 10;
const WORKSPACE_COUNT = 1000;
const NOTES_TARGET = 500_000;
const NOTES_BATCH_SIZE = 2000;
const SEED_PASSWORD = "Password123!";

const NOTE_TYPES = ["public", "private"] as const;
const STATUSES = ["draft", "published"] as const;

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

function pick<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCreatedAt(): Date {
    return new Date(Date.now() - Math.random() * TWO_YEARS_MS);
}

function randomUpdatedAt(createdAt: Date): Date {
    return new Date(createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime()));
}

async function truncateAll() {
    await db.execute(
        sql`TRUNCATE TABLE notes_vote, history, notes, workspace, agency_user, agency, "user" CASCADE`,
    );
}

async function seedAgencyAndUsers() {
    const [agencyRow] = await db
        .insert(agency)
        .values({ id: uuidv7(), companyName: faker.company.name() })
        .returning();

    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

    const agencyUsers = Array.from({ length: AGENCY_USER_COUNT }, () => ({
        id: uuidv7(),
        email: faker.internet.email().toLowerCase(),
        password: passwordHash,
        name: faker.person.fullName(),
        type: "agency_user" as const,
    }));

    const systemUser = {
        id: uuidv7(),
        email: "system@notesaas.local",
        password: passwordHash,
        name: "System User",
        type: "system_user" as const,
    };

    await db.insert(user).values([...agencyUsers, systemUser]);

    await db.insert(agencyUser).values(
        agencyUsers.map((u) => ({ userId: u.id, companyId: agencyRow.id })),
    );

    return { agencyRow, agencyUsers, systemUser };
}

async function seedWorkspaces(agencyId: string, userIds: string[]) {
    const rows = Array.from({ length: WORKSPACE_COUNT }, (_, i) => ({
        id: uuidv7(),
        name: `${faker.company.buzzPhrase()} ${i + 1}`,
        companyId: agencyId,
        createdBy: userIds[i % userIds.length],
    }));

    await db.insert(workspace).values(rows);
    return rows;
}

function distributeNoteCounts(workspaceCount: number, target: number): number[] {
    const weights = Array.from({ length: workspaceCount }, () => -Math.log(Math.random()));
    const weightSum = weights.reduce((a, b) => a + b, 0);

    const counts = weights.map((w) => Math.round((w / weightSum) * target));
    const countSum = counts.reduce((a, b) => a + b, 0);
    counts[counts.length - 1] += target - countSum;

    return counts;
}

function buildNote(workspaceId: string, agencyId: string, userIds: string[]) {
    const createdAt = randomCreatedAt();
    return {
        id: uuidv7(),
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(randomInt(2, 5)),
        tags: faker.lorem.words(randomInt(1, 4)).split(" "),
        upvotes: randomInt(0, 50),
        downvotes: randomInt(0, 50),
        noteType: pick(NOTE_TYPES),
        status: pick(STATUSES),
        createdAt,
        updatedAt: randomUpdatedAt(createdAt),
        creatorId: pick(userIds),
        companyId: agencyId,
        workspaceId,
    };
}

async function seedNotes(
    agencyId: string,
    userIds: string[],
    workspaces: { id: string }[],
) {
    const counts = distributeNoteCounts(workspaces.length, NOTES_TARGET);

    let batch: ReturnType<typeof buildNote>[] = [];
    let inserted = 0;
    let batchesInserted = 0;

    const flush = async () => {
        if (batch.length === 0) return;
        await db.insert(notes).values(batch);
        inserted += batch.length;
        batchesInserted += 1;
        batch = [];
        if (batchesInserted % 20 === 0) {
            console.log(`  inserted ${inserted.toLocaleString()} / ${NOTES_TARGET.toLocaleString()} notes`);
        }
    };

    for (let i = 0; i < workspaces.length; i++) {
        const ws = workspaces[i];
        const count = counts[i];
        for (let n = 0; n < count; n++) {
            batch.push(buildNote(ws.id, agencyId, userIds));
            if (batch.length >= NOTES_BATCH_SIZE) {
                await flush();
            }
        }
    }
    await flush();

    return inserted;
}

async function main() {
    console.log("Truncating existing seed tables...");
    await truncateAll();

    console.log("Seeding agency and users...");
    const { agencyRow, agencyUsers, systemUser } = await seedAgencyAndUsers();
    const userIds = agencyUsers.map((u) => u.id);

    console.log("Seeding workspaces...");
    const workspaces = await seedWorkspaces(agencyRow.id, userIds);

    console.log("Seeding notes (this will take a while)...");
    const noteCount = await seedNotes(agencyRow.id, userIds, workspaces);

    console.log("\nDone.");
    console.log(`  agency:      1 (${agencyRow.companyName})`);
    console.log(`  users:       ${agencyUsers.length + 1} (${agencyUsers.length} agency_user + 1 system_user)`);
    console.log(`  workspaces:  ${workspaces.length}`);
    console.log(`  notes:       ${noteCount}`);
    console.log(`\nShared login password for all seeded users: ${SEED_PASSWORD}`);
    console.log(`Example login: ${agencyUsers[0].email} / ${SEED_PASSWORD}`);
    console.log(`System user:   ${systemUser.email} / ${SEED_PASSWORD}`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
