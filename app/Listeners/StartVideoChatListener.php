<?php

namespace App\Listeners;

use App\Notifications\StartVideoChatNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Notification;

class StartVideoChatListener
{
    /**
     * Create the event listener.
     *
     * @return void
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     *
     * @param  object  $event
     * @return void
     */
    public function handle($event)
    {
        try {
            $data               =  $event->data;
            // $avatarUser         = $event->avatarUser;
            // $invatiton        =  $event->invitation;
            // $userNotification   =  $event->userNotification;
            // Notification::send(
            //     $userNotification,
            //     new InvitationFriendNotification($user, $invatiton ,$avatarUser)
            // );
           new StartVideoChatNotification($data);
        } catch (\Exception $exception) {
            throw ($exception);
        }
    }
}
