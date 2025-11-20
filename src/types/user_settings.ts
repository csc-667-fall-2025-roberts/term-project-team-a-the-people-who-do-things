import {Users} from "./users.ts";

export type UserSettings = {
    userID?: keyof Users;
    preferences?: JSON;
    updated_at?: Date;
}