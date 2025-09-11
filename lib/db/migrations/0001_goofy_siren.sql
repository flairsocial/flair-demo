CREATE TABLE "flair_chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flair_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"content" text NOT NULL,
	"sender" text NOT NULL,
	"attached_files" json,
	"products" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flair_collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "flair_collection_items_collection_product_unique" UNIQUE("collection_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "flair_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"custom_banner" text,
	"is_public" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flair_products" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"original_price" integer,
	"brand" text,
	"category" text,
	"image" text NOT NULL,
	"url" text,
	"specifications" json,
	"reviews" json,
	"availability" json,
	"real_time_data" json,
	"search_vector" text,
	"tags" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flair_user_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flair_user_saved_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"priority" integer DEFAULT 0,
	"saved_price" integer,
	"saved_from_url" text,
	CONSTRAINT "flair_user_saved_items_user_product_unique" UNIQUE("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "flair_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"profile_data" json,
	CONSTRAINT "flair_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DROP TABLE "chat_conversations" CASCADE;--> statement-breakpoint
DROP TABLE "chat_messages" CASCADE;--> statement-breakpoint
DROP TABLE "collection_items" CASCADE;--> statement-breakpoint
DROP TABLE "collections" CASCADE;--> statement-breakpoint
DROP TABLE "products" CASCADE;--> statement-breakpoint
DROP TABLE "user_activity" CASCADE;--> statement-breakpoint
DROP TABLE "user_saved_items" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "flair_chat_conversations" ADD CONSTRAINT "flair_chat_conversations_user_id_flair_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."flair_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flair_chat_messages" ADD CONSTRAINT "flair_chat_messages_conversation_id_flair_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."flair_chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flair_collection_items" ADD CONSTRAINT "flair_collection_items_collection_id_flair_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."flair_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flair_collection_items" ADD CONSTRAINT "flair_collection_items_product_id_flair_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."flair_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flair_collections" ADD CONSTRAINT "flair_collections_user_id_flair_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."flair_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flair_user_activity" ADD CONSTRAINT "flair_user_activity_user_id_flair_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."flair_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flair_user_saved_items" ADD CONSTRAINT "flair_user_saved_items_user_id_flair_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."flair_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flair_user_saved_items" ADD CONSTRAINT "flair_user_saved_items_product_id_flair_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."flair_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flair_chat_conversations_user_idx" ON "flair_chat_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "flair_chat_conversations_updated_at_idx" ON "flair_chat_conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "flair_chat_messages_conversation_idx" ON "flair_chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "flair_chat_messages_sender_idx" ON "flair_chat_messages" USING btree ("sender");--> statement-breakpoint
CREATE INDEX "flair_chat_messages_created_at_idx" ON "flair_chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "flair_collection_items_collection_idx" ON "flair_collection_items" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "flair_collection_items_product_idx" ON "flair_collection_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "flair_collection_items_collection_product_idx" ON "flair_collection_items" USING btree ("collection_id","product_id");--> statement-breakpoint
CREATE INDEX "flair_collections_user_idx" ON "flair_collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "flair_collections_name_idx" ON "flair_collections" USING btree ("name");--> statement-breakpoint
CREATE INDEX "flair_products_title_idx" ON "flair_products" USING btree ("title");--> statement-breakpoint
CREATE INDEX "flair_products_brand_idx" ON "flair_products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "flair_products_category_idx" ON "flair_products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "flair_products_price_idx" ON "flair_products" USING btree ("price");--> statement-breakpoint
CREATE INDEX "flair_user_activity_user_idx" ON "flair_user_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "flair_user_activity_action_idx" ON "flair_user_activity" USING btree ("action");--> statement-breakpoint
CREATE INDEX "flair_user_activity_created_at_idx" ON "flair_user_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "flair_user_saved_items_user_idx" ON "flair_user_saved_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "flair_user_saved_items_product_idx" ON "flair_user_saved_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "flair_user_saved_items_user_product_idx" ON "flair_user_saved_items" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "flair_user_saved_items_saved_at_idx" ON "flair_user_saved_items" USING btree ("saved_at");--> statement-breakpoint
CREATE INDEX "flair_users_email_idx" ON "flair_users" USING btree ("email");