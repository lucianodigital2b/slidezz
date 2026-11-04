<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LanguageController extends Controller
{
    /** Save the dashboard language on the account so it follows the user to any browser. */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => ['required', 'string', Rule::in(User::LOCALES)],
        ]);

        $request->user()->update(['locale' => $validated['locale']]);

        return back();
    }
}
