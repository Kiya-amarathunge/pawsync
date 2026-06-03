import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  phoneNumber: z.string().optional(),
  role: z.enum(["pet_owner", "veterinarian", "service_provider"]),
  licenseNumber: z.string().optional(),
  specialization: z.string().optional(),
  businessName: z.string().optional(),
  businessRegistrationNumber: z.string().optional(),
  serviceType: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).trim().optional(),
  phoneNumber: z.string().optional(),
});
