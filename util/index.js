import { randomUUID } from "crypto";

export const randomId = () => {
    return randomUUID().split("-").join("");
}
