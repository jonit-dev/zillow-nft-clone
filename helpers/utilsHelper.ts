/* eslint-disable no-undef */
/* eslint-disable node/no-unpublished-import */
import { utils } from "ethers";

export const toToken = (amount: string) => utils.parseEther(amount);
