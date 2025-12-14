import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add the 'title' column to the 'games' table
  pgm.addColumn("games", {
    title: {
      type: "VARCHAR(255)",
      notNull: true,
      default: "Scrabble Game", // Default name for existing games
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // If we ever need to undo this, drop the column
  pgm.dropColumn("games", "title");
}