import { makeHandlers } from "lambda-decorator";
import TodoController from "./todo-controller";

export default makeHandlers(TodoController);