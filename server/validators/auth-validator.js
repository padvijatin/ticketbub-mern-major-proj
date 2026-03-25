const { z } = require("zod");

const registerSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  email: z.email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number is too long"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

module.exports = {
  registerSchema,
  loginSchema,
};
