
import { z } from "zod";
import { messageSchema } from "./lib/validators.js";

const testPayloads = [
    {
        name: "Valid File",
        data: {
            file: {
                data: "data:image/png;base64,foo",
                name: "test.png",
                size: 1024,
                type: "image/png"
            },
            text: ""
        }
    },
    {
        name: "File with empty type",
        data: {
            file: {
                data: "data:application/octet-stream;base64,bar",
                name: "unknown",
                size: 1024,
                type: ""
            },
            text: ""
        }
    },
    {
        name: "File with 0 size",
        data: {
            file: {
                data: "data:text/plain;base64,baz",
                name: "empty.txt",
                size: 0,
                type: "text/plain"
            },
            text: "some text"
        }
    },
    {
        name: "Text only",
        data: {
            text: "Hello"
        }
    },
    {
        name: "Missing required file field (e.g. data is missing)",
        data: {
            file: {
                name: "bad.png",
                size: 100,
                type: "image/png"
            },
            text: ""
        }
    }
];

console.log("Running Schema Tests...");

testPayloads.forEach(tc => {
    try {
        messageSchema.parse(tc.data);
        console.log(`[PASS] ${tc.name}`);
    } catch (e) {
        console.log(`[FAIL] ${tc.name}`);
        if (e instanceof z.ZodError) {
            console.log(JSON.stringify(e.format(), null, 2));
        } else {
            console.log(e.message);
        }
    }
});
