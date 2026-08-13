import axios from "axios";
import { getBaseUrl } from "../config/network";

const API_URL = `${getBaseUrl()}/api`;

const API = axios.create({
  baseURL: API_URL,
});

export default API;