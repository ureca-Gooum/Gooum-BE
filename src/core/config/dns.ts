/**
 * Windows 환경에서 Node.js의 c-ares DNS 리졸버가
 * Cosmos DB(MongoDB vCore)의 SRV 레코드를 조회하지 못하는 문제 우회
 * Google Public DNS를 강제 지정하여 해결
 * (Azure 배포 환경에서는 불필요하나 남겨둬도 무방)
 */
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
