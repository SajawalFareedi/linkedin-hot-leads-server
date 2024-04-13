yarn run v1.22.19
$ "C:\Users\BISMILLAH COMPUTERS\OneDrive\Upwork\clients\NilsGrammerstorf\floppy_app\server\node_modules\.bin\prisma" migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- CreateTable
CREATE TABLE "api" (
    "email" VARCHAR NOT NULL,
    "api_key" VARCHAR NOT NULL,
    "created" VARCHAR NOT NULL,
    "uuid" VARCHAR NOT NULL
);

-- CreateTable
CREATE TABLE "cookie" (
    "user_id" VARCHAR NOT NULL,
    "li_at" VARCHAR NOT NULL,
    "jsession_id" VARCHAR NOT NULL,
    "uuid" VARCHAR NOT NULL,
    "urn" VARCHAR NOT NULL,
    "ispremium" VARCHAR NOT NULL,
    "running" VARCHAR NOT NULL,
    "scraping_day" INTEGER NOT NULL,
    "last_profile_view" VARCHAR
);

-- CreateTable
CREATE TABLE "customer" (
    "urn" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "profile_url" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "uuid" VARCHAR NOT NULL,
    "added" VARCHAR NOT NULL,
    "last_ran" VARCHAR
);

-- CreateTable
CREATE TABLE "person" (
    "uuid" VARCHAR NOT NULL,
    "urn" VARCHAR NOT NULL,
    "person_urn" VARCHAR NOT NULL,
    "first_name" VARCHAR NOT NULL,
    "last_name" VARCHAR NOT NULL,
    "profile_url" VARCHAR NOT NULL,
    "profile_headline" VARCHAR NOT NULL,
    "connection_degree" VARCHAR,
    "is_follower" VARCHAR,
    "when_connected" VARCHAR,
    "job_title" VARCHAR,
    "reactions_count" INTEGER,
    "comments_count" INTEGER,
    "profile_view_count" INTEGER,
    "score" INTEGER
);

-- CreateIndex
CREATE UNIQUE INDEX "api_unique" ON "api"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "cookie_unique" ON "cookie"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "customer_unique" ON "customer"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "person_person_urn_idx" ON "person"("person_urn");

Done in 0.79s.
