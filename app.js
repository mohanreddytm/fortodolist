const express = require("express");
const path = require("path");
const { format } = require("date-fns");
const { isValid } = require("date-fns");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const inti = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Running Successfully");
    });
  } catch (e) {
    console.log(`DB error${e.message}`);
    process.exit(1);
  }
};

inti();

const convert = (x) => {
  return {
    id: x.id,
    todo: x.todo,
    priority: x.priority,
    status: x.status,
    category: x.category,
    dueDate: x.due_date,
  };
};

const three = (x) => {
  return (
    x.priority !== undefined &&
    x.status !== undefined &&
    x.category !== undefined
  );
};

const both = (x) => {
  return x.priority !== undefined && x.status !== undefined;
};

const statusOnly = (x) => {
  return x.status !== undefined;
};

const priOnly = (x) => {
  return x.priority !== undefined;
};

const bothCategoryPriority = (x) => {
  return x.category !== undefined && x.priority !== undefined;
};

const checkStatus = (status) => {
  if (status !== "IN PROGRESS" && status !== "TO DO" && status !== "DONE") {
    return true;
  } else {
    return false;
  }
};

const checkCategory = (category) => {
  if (category !== "HOME" && category !== "LEARNING" && category !== "WORK") {
    return true;
  } else {
    false;
  }
};

const checkPriority = (priority) => {
  if (priority !== "HIGH" && priority !== "LOW" && priority !== "MEDIUM") {
    return true;
  } else {
    return false;
  }
};

const onlyCategory = (x) => {
  return x.category !== undefined;
};

const categoryAndStatus = (x) => {
  return x.category !== undefined && x.status !== undefined;
};
app.get("/todos/", async (request, response) => {
  let getTodoQuery = "";
  let statusCheck = "";
  let categoryCheck = "";
  let priorityCheck = "";
  const { status, priority, search_q = "", category } = request.query;
  switch (true) {
    case three(request.query):
      statusCheck = checkStatus(status);
      categoryCheck = checkCategory(category);
      priorityCheck = checkPriority(priority);
      if (statusCheck) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else if (categoryCheck) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else if (priorityCheck) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        getTodoQuery = `select * from todo where status like '%${status}%' and priority like '%${priority}%' and category like '%${category}%'`;
      }
      break;
    case both(request.query):
      statusCheck = checkStatus(status);
      priorityCheck = checkPriority(priority);
      if (statusCheck) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else if (priorityCheck) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        getTodoQuery = `select * from todo where status like '%${status}%' and priority like '%${priority}%';`;
      }
      break;
    case bothCategoryPriority(request.query):
      categoryCheck = checkCategory(category);
      priorityCheck = checkPriority(priority);
      if (categoryCheck) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else if (priorityCheck) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        getTodoQuery = `select * from todo where category like '%${category}%' and priority like '%${priority}%';`;
      }

      break;

    case categoryAndStatus(request.query):
      statusCheck = checkStatus(status);
      categoryCheck = checkCategory(category);

      if (statusCheck) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else if (categoryCheck) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        getTodoQuery = `select * from todo where category like '%${category}%' and status like '%${status}%';`;
      }

      break;

    case onlyCategory(request.query):
      categoryCheck = checkCategory(category);
      if (categoryCheck) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        getTodoQuery = `select * from todo where category like '%${category}%';`;
      }

      break;

    case statusOnly(request.query):
      if (status !== "IN PROGRESS" && status !== "TO DO" && status !== "DONE") {
        response.status(400);
        response.send("Invalid Todo Status");
      } else {
        getTodoQuery = `select * from todo where status like '%${status}%';`;
      }

      break;
    case priOnly(request.query):
      if (priority !== "HIGH" && priority !== "LOW" && priority !== "MEDIUM") {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        getTodoQuery = `select * from todo where priority like '%${priority}%';`;
      }
      break;
    default:
      getTodoQuery = `select * from todo where todo like '%${search_q}%'`;
      break;
  }
  if (getTodoQuery.length === 0) {
    //to be changed
  } else {
    const data = await db.all(getTodoQuery);
    response.send(data.map((each) => convert(each)));
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const query = `select * from todo where id = ${todoId}`;
  const idResponse = await db.get(query);
  response.send(convert(idResponse));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const isValidOrNot = await isValid(new Date(date));

  if (isValidOrNot) {
    let dueDate = await format(new Date(date), "yyyy-MM-dd");

    const query = `select * from todo where due_date = '${dueDate}' `;
    const result = await db.get(query);
    if (result === undefined) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      response.send(convert(result));
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const query = `INSERT INTO todo(id, todo, priority, status category, dueDate) VALUES(${id},
        '${todo}','${priority}','${status}','${category}','${dueDate}')`;
  await db.run(query);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let maxOne;
  const final = request.body;
  switch (true) {
    case final.status !== undefined:
      maxOne = "Status";
      break;
    case final.priority !== undefined:
      maxOne = "Priority";
      break;
    case final.todo !== undefined:
      maxOne = "Todo";
    case final.category !== undefined:
      maxOne = "Category";
    case final.dueDate !== undefined:
      maxOne = "Due Date";
    default:
      break;
  }

  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body;

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category = '${category}',
      dueDate = '${dueDate}'
    WHERE
      id = ${todoId};`;

  await db.run(updateTodoQuery);
  response.send(`${maxOne} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
