const { MongoClient } = require("mongodb");

const uri =
  "mongodb://kabeer:kabeer123@cluster0-shard-00-00.vaxcfpk.mongodb.net:27017/invoicesystem?ssl=true&authSource=admin";

async function test() {
  console.log("Testing connection to single shard...");

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log("✅ Connected to single shard!");

    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log(
      "Collections:",
      collections.map((c) => c.name),
    );

    client.close();

    // Now test full connection
    console.log("\nTesting full connection string...");
    const fullUri =
      "mongodb://kabeer:kabeer123@cluster0-shard-00-00.vaxcfpk.mongodb.net:27017,cluster0-shard-00-01.vaxcfpk.mongodb.net:27017,cluster0-shard-00-02.vaxcfpk.mongodb.net:27017/invoicesystem?ssl=true&replicaSet=atlas-vaxcfpk-shard-0&authSource=admin&retryWrites=true&w=majority";

    const fullClient = new MongoClient(fullUri);
    await fullClient.connect();
    console.log("✅ Full connection successful!");
  } catch (err) {
    console.log("❌ Error:", err.message);

    // Try without SSL
    console.log("\nTrying without SSL...");
    const noSSL =
      "mongodb://kabeer:kabeer123@cluster0-shard-00-00.vaxcfpk.mongodb.net:27017/invoicesystem?authSource=admin";
    const client2 = new MongoClient(noSSL);

    try {
      await client2.connect();
      console.log("✅ Works without SSL!");
    } catch (err2) {
      console.log("❌ Also fails:", err2.message);

      // Test if port is open
      console.log("\nTesting network connectivity...");
      const net = require("net");
      const socket = new net.Socket();

      socket.setTimeout(3000);
      socket.connect(27017, "cluster0-shard-00-00.vaxcfpk.mongodb.net", () => {
        console.log("✅ Port 27017 is open");
        socket.destroy();
      });

      socket.on("timeout", () => {
        console.log("❌ Port 27017 timeout - hostel blocks MongoDB");
        socket.destroy();
      });

      socket.on("error", () => {
        console.log("❌ Port 27017 blocked by hostel firewall");
      });
    }
  }
}

test();
