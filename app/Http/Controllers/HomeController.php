<?php

namespace App\Http\Controllers;

use App\Events\StartVideoChat;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use \Pusher\Pusher;

class HomeController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Show the application dashboard.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return view('home');
    }

    public function authenticate(Request $request) {
        $socketId = $request->socket_id;
        $channelName = $request->channel_name;

        $pusher = new Pusher('343b495272969a826752', 'aa4d3393c052d887a063', '1407380', [
            'cluster' => env('PUSHER_APP_CLUSTER'),
            'encrypted' => true
        ]);

        $presence_data = ['name' => auth()->user()->name];
        $key = $pusher->presenceAuth($channelName, $socketId, auth()->id(), $presence_data);
        return response($key);
    }

    public function callUser(Request $request)
    {
        $data['userToCall'] = $request->user_to_call;
        $data['signalData'] = $request->signal_data;
        $data['from'] = Auth::id();
        $data['type'] = 'incomingCall';

        broadcast(new StartVideoChat($data))->toOthers();
        
    }
    public function acceptCall(Request $request)
    {
        $data['signal'] = $request->signal;
        $data['to'] = $request->to;
        $data['type'] = 'callAccepted';
        broadcast(new StartVideoChat($data))->toOthers();
    }

    public function endCall(Request $request)
    {
        $data['to'] = $request->to;
        $data['type'] = 'endCall';
        broadcast(new StartVideoChat($data))->toOthers();
    }

    public function declineCall(Request $request)
    {
        $data['to'] = $request->to;
        $data['type'] = 'declineCall';
        broadcast(new StartVideoChat($data))->toOthers();
    }

    public function startSlideShow(Request $request)
    {
        $data['to'] = $request->to;
        $data['dataSlideShow']   = $request->dataSlideShow;
        $data['from'] = $request->user()->id;
        $data['type'] = 'startSlideShow';
        broadcast(new StartVideoChat($data))->toOthers();
    }
    public function stopSlideShow(Request $request)
    {
        $data['to'] = $request->to;
        $data['from'] = $request->user()->id;
        $data['type'] = 'stopSlideShow';
        broadcast(new StartVideoChat($data))->toOthers();
    }
}
