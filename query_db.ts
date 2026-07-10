import { db } from "./src/firebase";
import { collection, getDocs } from "firebase/firestore";

async function run() {
  const empSnap = await getDocs(collection(db, "employees"));
  const employees = empSnap.docs.map(d => d.data());
  const secSnap = await getDocs(collection(db, "sectors"));
  const sectors = secSnap.docs.map(d => d.data());
  
  console.log("Sectors:", JSON.stringify(sectors, null, 2));
  console.log("Employees:", JSON.stringify(employees, null, 2));
}

run().catch(console.error);
