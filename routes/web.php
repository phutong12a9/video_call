<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

Auth::routes();

Route::get('/home', [App\Http\Controllers\HomeController::class, 'index'])->name('home');

Route::post('pusher/auth', [App\Http\Controllers\HomeController::class, 'authenticate'])-> name('authenticate');
Route::get('/allUsers', function () {
    // fetch all users apart from the authenticated user
    $users = User::select('id','name')->where('id', '<>', Auth::id())->get();
    return  $users;
});

// Endpoints to call or receive calls.
Route::post('/video/call-user', 'App\Http\Controllers\HomeController@callUser');
Route::post('/video/accept-call', 'App\Http\Controllers\HomeController@acceptCall');
Route::post('/video/end-call', 'App\Http\Controllers\HomeController@endCall');
Route::post('/video/decline-call', 'App\Http\Controllers\HomeController@declineCall');
Route::post('/video/start-slide-show', 'App\Http\Controllers\HomeController@startSlideShow');
Route::post('/video/stop-slide-show', 'App\Http\Controllers\HomeController@stopSlideShow');

