<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RadarTrajectoryRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'id'               => ['required', 'string', 'max:160'],
            'name'             => ['required', 'string', 'max:180'],
            'displayName'      => ['nullable', 'string', 'max:180'],
            'rawName'          => ['nullable', 'string', 'max:220'],
            'designation'      => ['nullable', 'string', 'max:80'],
            'detailIdentifier' => ['nullable', 'string', 'max:120'],
            'spkId'            => ['nullable', 'string', 'max:80'],
            'approachTime'     => ['required', 'string', 'max:80'],
            'anchor'           => ['nullable', 'string', 'in:approach,now'],
            'history_days'     => ['nullable', 'integer', 'min:7', 'max:720'],
        ];
    }

    public function messages(): array
    {
        return [
            'id.required'          => 'O identificador do objeto é obrigatório.',
            'name.required'        => 'O nome do objeto é obrigatório.',
            'approachTime.required' => 'O tempo de aproximação é obrigatório.',
            'anchor.in'            => 'Escolha approach ou now como âncora.',
            'history_days.min'     => 'O histórico mínimo é de 7 dias.',
            'history_days.max'     => 'O histórico máximo é de 720 dias.',
        ];
    }
}
