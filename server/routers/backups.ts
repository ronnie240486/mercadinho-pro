import * as db from "../db";
import { managementProcedure } from "./_permissions";
import { router } from "../_core/trpc";
import { runGoogleDriveBackup } from "../googleDriveBackups";

export const backupsRouter = router({
  status: managementProcedure.query(async ({ ctx }) => {
    const [connection, runs] = await Promise.all([
      db.getGoogleDriveBackupConnection(ctx.user.id),
      db.listGoogleDriveBackupRuns(ctx.user.id),
    ]);

    return {
      connection: connection
        ? {
            status: connection.status,
            googleEmail: connection.googleEmail,
            folderName: connection.folderName,
            lastBackupAt: connection.lastBackupAt,
            lastBackupStatus: connection.lastBackupStatus,
            lastBackupError: connection.lastBackupError,
          }
        : null,
      runs,
    };
  }),
  runNow: managementProcedure.mutation(async ({ ctx }) => runGoogleDriveBackup(ctx.user.id, "manual")),
});
