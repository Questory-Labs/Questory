import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationChannelsController } from "./notification-channels.controller";
import { NotificationChannelsService } from "./notification-channels.service";
import { NotificationDeliveryService } from "./delivery/notification-delivery.service";
import { NotificationVerifyController } from "./notification-verify.controller";

@Module({
  controllers: [NotificationChannelsController, NotificationVerifyController, NotificationsController],
  providers: [NotificationsService, NotificationChannelsService, NotificationDeliveryService],
  exports: [NotificationsService, NotificationDeliveryService],
})
export class NotificationsModule {}
