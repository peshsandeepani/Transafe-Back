import { io } from "socket.io-client";
import { getBaseUrl } from "../config/network";

const SOCKET_URL = getBaseUrl();

const socket = io(SOCKET_URL);

export default socket;