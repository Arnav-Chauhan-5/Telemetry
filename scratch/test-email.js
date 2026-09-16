const email = `test-${Date.now()}@ethereal.email`;
const password = "password123";
let token = "";
let serviceId = "";

async function run() {
  console.log("1. Registering user");
  const regRes = await fetch("http://localhost:4000/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!regRes.ok) {
    throw new Error(`Signup failed: ${await regRes.text()}`);
  }
  const regData = await regRes.json();
  console.log("Signup ok");

  console.log("2. Logging in");
  const loginRes = await fetch("http://localhost:4000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  token = loginData.token;
  console.log("Token received");

  console.log("3. Creating service with broken URL");
  const createRes = await fetch("http://localhost:4000/services", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ name: "Broken Service", url: "http://localhost:9999", checkIntervalSeconds: 10 })
  });
  const serviceData = await createRes.json();
  serviceId = serviceData._id;
  console.log("Service created:", serviceData);

  console.log("Waiting 35 seconds for 3 consecutive failures...");
  await new Promise(r => setTimeout(r, 35000));

  console.log("4. Fixing the URL to recover the service");
  const updateRes = await fetch(`http://localhost:4000/services/${serviceId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ url: "https://example.com" })
  });
  const updateData = await updateRes.json();
  console.log("Service updated:", updateData.url);

  console.log("Waiting 15 seconds for recovery...");
  await new Promise(r => setTimeout(r, 15000));
  console.log("Test finished.");
}

run().catch(console.error);
