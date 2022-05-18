<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
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
}
