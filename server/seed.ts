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

  // Website: Landing (main) 12 slots
  for (let i = 1; i <= 12; i++) {
    try {
      await storage.createSlot({
        pageType: "main",
        mediaType: "website",
        position: `slot-${i}`,
        dimensions: i % 3 === 0 ? "300x250" : "728x90",
        pricing: String(30000 + i * 1000),
        status: "available",
      });
      console.log(`Created website main slot-${i}`);
    } catch (error) {}
  }

  // Website: Student Home 12 slots
  for (let i = 1; i <= 12; i++) {
    try {
      await storage.createSlot({
        pageType: "student_home",
        mediaType: "website",
        position: `slot-${i}`,
        dimensions: i % 2 === 0 ? "300x250" : "728x90",
        pricing: String(28000 + i * 900),
        status: "available",
      });
      console.log(`Created website student_home slot-${i}`);
    } catch (error) {}
  }

  // Website: Login page 2 slots
  for (let i = 1; i <= 2; i++) {
    try {
      await storage.createSlot({
        pageType: "student_login",
        mediaType: "website",
        position: `slot-${i}`,
        dimensions: "300x250",
        pricing: String(25000 + i * 2000),
        status: "available",
      });
      console.log(`Created website student_login slot-${i}`);
    } catch (error) {}
  }

  // Mobile App: 2 slots
  for (let i = 1; i <= 2; i++) {
    try {
      await storage.createSlot({
        pageType: "main",
        mediaType: "mobile",
        position: `mobile-slot-${i}`,
        dimensions: i === 1 ? "320x50" : "300x250",
        pricing: String(35000 + i * 3000),
        status: "available",
      });
      console.log(`Created mobile slot-${i}`);
    } catch (error) {}
  }

  // Magazine: 6 slots (pages)
  for (let i = 1; i <= 6; i++) {
    try {
      await storage.createSlot({
        pageType: "main",
        mediaType: "magazine",
        position: i === 1 ? "cover-inner" : "inside",
        dimensions: "210x297mm",
        pricing: String(90000 + i * 5000),
        status: "available",
        magazinePageNumber: i,
      });
      console.log(`Created magazine page ${i}`);
    } catch (error) {}
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
