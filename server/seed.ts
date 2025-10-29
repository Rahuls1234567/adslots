import { storage } from "./storage";

async function seed() {
  console.log("Seeding database...");

  // Create users for each role
  const users = [
    { phone: "+1234567890", name: "Test Client", email: "client@test.com", role: "client" as const, gstNumber: "GST123456", address: "123 Main St" },
    { phone: "+1234567891", name: "John Manager", email: "manager@test.com", role: "manager" as const },
    { phone: "+1234567892", name: "Jane VP", email: "vp@test.com", role: "vp" as const },
    { phone: "+1234567893", name: "PV Sir", email: "pv@test.com", role: "pv_sir" as const },
    { phone: "+1234567894", name: "Alice Accounts", email: "accounts@test.com", role: "accounts" as const },
    { phone: "+1234567895", name: "Bob IT", email: "it@test.com", role: "it" as const },
  ];

  for (const user of users) {
    try {
      const existing = await storage.getUserByPhone(user.phone);
      if (!existing) {
        await storage.createUser(user);
        console.log(`Created user: ${user.name}`);
      }
    } catch (error) {
      console.error(`Error creating user ${user.name}:`, error);
    }
  }

  // Create some sample slots
  const slots = [
    {
      pageType: "main" as const,
      mediaType: "website" as const,
      position: "header",
      dimensions: "728x90",
      pricing: "50000",
      status: "available" as const,
    },
    {
      pageType: "course" as const,
      mediaType: "website" as const,
      position: "sidebar",
      dimensions: "300x250",
      pricing: "30000",
      status: "available" as const,
    },
    {
      pageType: "webinar" as const,
      mediaType: "website" as const,
      position: "footer",
      dimensions: "728x90",
      pricing: "25000",
      status: "available" as const,
    },
    {
      pageType: "student_login" as const,
      mediaType: "website" as const,
      position: "sidebar",
      dimensions: "160x600",
      pricing: "40000",
      status: "available" as const,
    },
    {
      pageType: "main" as const,
      mediaType: "mobile" as const,
      position: "banner",
      dimensions: "320x50",
      pricing: "35000",
      status: "available" as const,
    },
    {
      pageType: "main" as const,
      mediaType: "magazine" as const,
      position: "full-page",
      dimensions: "210x297mm",
      pricing: "100000",
      status: "available" as const,
      magazinePageNumber: 2,
    },
  ];

  for (const slot of slots) {
    try {
      await storage.createSlot(slot);
      console.log(`Created slot: ${slot.pageType} - ${slot.position}`);
    } catch (error) {
      console.error(`Error creating slot:`, error);
    }
  }

  console.log("Seeding complete!");
  console.log("\nTest users:");
  console.log("Client: +1234567890 (OTP will be logged to console)");
  console.log("Manager: +1234567891");
  console.log("VP: +1234567892");
  console.log("PV Sir: +1234567893");
  console.log("Accounts: +1234567894");
  console.log("IT: +1234567895");
}

seed().catch(console.error);
