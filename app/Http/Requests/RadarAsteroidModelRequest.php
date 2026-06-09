<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RadarAsteroidModelRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'id'               => ['required', 'string', 'max:160'],
            'name'             => ['required', 'string', 'max:180'],
            'displayName'      => ['nullable', 'string', 'max:180'],
            'designation'      => ['nullable', 'string', 'max:80'],
            'detailIdentifier' => ['nullable', 'string', 'max:120'],
            'spkId'            => ['nullable', 'string', 'max:80'],
            'objectType'       => ['nullable', 'string', 'max:40'],
            'diameterMeters'    => ['nullable', 'numeric'],
            'diameterMinMeters' => ['nullable', 'numeric'],
            'diameterMaxMeters' => ['nullable', 'numeric'],
            'absoluteMagnitude' => ['nullable', 'numeric'],
        ];
    }

    public function messages(): array
    {
        return [
            'id.required'   => 'O identificador do objeto é obrigatório.',
            'name.required' => 'O nome do objeto é obrigatório.',
        ];
    }
}
