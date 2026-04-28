import { z } from "zod";

export const schema = z.object({
  // Vehicle Info
  vehicleType: z.string().min(1, "Required"),
  year: z.number().min(1990).max(2026),
  mileage: z.number().min(0),
  // Driver
  driverAge: z.number().min(18).max(100),
  yearsLicensed: z.number().min(0),
  cleanRecord: z.boolean(),
  // Coverage
  coverageLevel: z.string().min(1, "Required"),
  deductible: z.number().min(250).max(5000),
});

export type FormValues = z.infer<typeof schema>;
