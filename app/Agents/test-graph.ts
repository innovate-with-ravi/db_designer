import { config } from "dotenv";
// Load environment variables from .env file
config();
import { erArchitectAgent } from "./graph";
import { AgentState } from "./state";

async function runTest() {
  console.log("🚀 Starting LangGraph execution...");

  // The initial state matching your AgentState schema
  const initialState: typeof AgentState.State = {
    scenario:
      "An e-commerce system with users, products, and orders. An order can have multiple products.",
    jsonSchema: {
      entities: [
        {
          attributes: [
            {
              attributeType: "simple",
              dataType: "INT",
              isNotNull: false,
              isPrimaryKey: true,
              isUnique: false,
              name: "user_id",
              size: "",
            },
            {
              attributeType: "simple",
              dataType: "VARCHAR",
              isNotNull: true,
              isPrimaryKey: false,
              isUnique: true,
              name: "email",
              size: "255",
            },
            {
              attributeType: "simple",
              dataType: "VARCHAR",
              isNotNull: true,
              isPrimaryKey: false,
              isUnique: false,
              name: "full_name",
              size: "100",
            },
            {
              attributeType: "simple",
              dataType: "TIMESTAMP",
              isNotNull: true,
              isPrimaryKey: false,
              isUnique: false,
              name: "created_at",
              size: "",
            },
          ],
          name: "USER",
        },
        {
          attributes: [
            {
              attributeType: "simple",
              dataType: "INT",
              isNotNull: false,
              isPrimaryKey: true,
              isUnique: false,
              name: "product_id",
              size: "",
            },
            {
              attributeType: "simple",
              dataType: "VARCHAR",
              isNotNull: true,
              isPrimaryKey: false,
              isUnique: false,
              name: "name",
              size: "150",
            },
            {
              attributeType: "simple",
              dataType: "DECIMAL",
              isNotNull: true,
              isPrimaryKey: false,
              isUnique: false,
              name: "price",
              size: "10,2",
            },
            {
              attributeType: "simple",
              dataType: "INT",
              isNotNull: true,
              isPrimaryKey: false,
              isUnique: false,
              name: "stock_quantity",
              size: "",
            },
          ],
          name: "PRODUCT",
        },
        {
          attributes: [
            {
              attributeType: "simple",
              dataType: "INT",
              isNotNull: false,
              isPrimaryKey: true,
              isUnique: false,
              name: "order_id",
              size: "",
            },
            {
              attributeType: "simple",
              dataType: "TIMESTAMP",
              isNotNull: true,
              isPrimaryKey: false,
              isUnique: false,
              name: "order_date",
              size: "",
            },
            {
              attributeType: "derived",
              dataType: "DECIMAL",
              isNotNull: true,
              isPrimaryKey: false,
              isUnique: false,
              name: "total_amount",
              size: "10,2",
            },
            {
              attributeType: "simple",
              dataType: "VARCHAR",
              isNotNull: true,
              isPrimaryKey: false,
              isUnique: false,
              name: "status",
              size: "50",
            },
          ],
          name: "ORDER",
        },
        {
          attributes: [
            {
              attributeType: "simple",
              dataType: "INT",
              isNotNull: false,
              isPrimaryKey: true,
              isUnique: false,
              name: "order_item_id",
              size: "",
            },
            {
              attributeType: "simple",
              dataType: "INT",
              isNotNull: true,
              isPrimaryKey: false,
              isUnique: false,
              name: "quantity",
              size: "",
            },
            {
              attributeType: "simple",
              dataType: "DECIMAL",
              isNotNull: true,
              isPrimaryKey: false,
              isUnique: false,
              name: "unit_price",
              size: "10,2",
            },
          ],
          name: "ORDER_ITEM",
        },
      ],
      relationships: [
        {
          label: "PLACES",
          maxCardinality: "1:N",
          minCardinality: "0:1",
          sourceEntity: "USER",
          targetEntity: "ORDER",
        },
        {
          label: "CONTAINS",
          maxCardinality: "1:N",
          minCardinality: "1:1",
          sourceEntity: "ORDER",
          targetEntity: "ORDER_ITEM",
        },
        {
          label: "INCLUDED_IN",
          maxCardinality: "1:N",
          minCardinality: "0:1",
          sourceEntity: "PRODUCT",
          targetEntity: "ORDER_ITEM",
        },
      ],
    }, 
    isSchemaValid: false,
    dialect: null,
    schemaErrors: [],
    schemaFixRetries: 0,
    generatedSql: null,
    scriptErrors: [],
    isScriptValid: false,
    scriptFixRetries: 0,
    isVersion1Sql: false,
  };

  try {
    // Invoke the graph
    const finalState = await erArchitectAgent.invoke(initialState);

    console.log("✅ Execution Complete!");
    console.log("\n=== Refined SQL BY semanticRefinerNode ===");
    console.log(finalState.generatedSql);

    if (!finalState.isSchemaValid) {
      console.log("\n⚠️ Schema Errors:");
      console.log(finalState.schemaErrors);
    }

    console.log(`\n🔍 View the full trace on your LangSmith dashboard!`);
  } catch (error) {
    console.error("❌ Error during execution:", error);
  }
}

runTest();
