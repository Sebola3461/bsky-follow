import { AtpAgent } from "@atproto/api";
import config from "./config.json";
import { LoggerUtils } from "./LoggerUtils";

const bsky = new AtpAgent({
	service: "https://bsky.social",
});

class FollowersBot {
	private static latestFollowersCount = 0;
	private static readonly logger = new LoggerUtils("Client");

	private static async login() {
		try {
			this.logger.printInfo("Log-in initializing...");

			await bsky.login({
				identifier: config.username,
				password: config.password,
			});
		} catch (e) {
			this.logger.printError("Error during login: ", e);
		}
	}

	private static async checkFollowers() {
		try {
			this.logger.printInfo("Checking followers count...");

			const myProfile = await bsky.getProfile({ actor: config.username });

			if (!myProfile.data.followersCount)
				return this.logger.printWarning("No followers output!");

			if (this.latestFollowersCount < myProfile.data.followersCount) {
				this.logger.printInfo(`new follower found!`);
				this.logger.printInfo("Fetching followers list...");

				const followersList = await bsky.getFollowers({
					actor: config.username,
					limit: 100,
				});

				const toFollow = followersList.data.followers.filter(
					(follower) => !follower.viewer?.following
				);

				if (toFollow.length < 1)
					return this.logger.printWarning("You follow everyone!");

				for (const follower of toFollow) {
					try {
						this.logger.printInfo(
							`Following ${follower.handle}...`
						);

						await bsky.follow(follower.did);

						this.logger.printSuccess(
							`You're now following ${follower.handle}!`
						);

						await this.sleep(500);
					} catch (e) {
						this.logger.printError(
							`Cannot follow ${follower.handle}`,
							e
						);
					}
				}

				this.latestFollowersCount =
					(myProfile.data.followersCount || 0) + toFollow.length;

				this.logger.printSuccess("Recursive job done!");
			}
		} catch (e) {
			this.logger.printError("Error during fetch followers:", e);
		}
	}

	private static async sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private static async runRecursiveJob() {
		await this.checkFollowers();
		await this.sleep(config.sleep_timeout);
		this.runRecursiveJob();
	}

	public static async initialize() {
		await this.login();

		await this.runRecursiveJob();
	}
}

FollowersBot.initialize();
