<?php

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ApproachObservatoryRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'date_min' => ['nullable', 'date_format:Y-m-d'],
            'date_max' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_min'],
            'type' => ['nullable', Rule::in(['all', 'asteroid', 'comet'])],
            'dist_max' => ['nullable', 'regex:/^\d+(\.\d+)?(LD)?$/i'],
            'sort' => ['nullable', Rule::in(['date', 'dist', '-dist', 'v-rel', '-v-rel', 'object'])],
            'distance_unit' => ['nullable', Rule::in(['km', 'mi'])],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->filled('date_min') && $this->filled('date_max')) {
                $start = CarbonImmutable::parse($this->input('date_min'));
                $end = CarbonImmutable::parse($this->input('date_max'));

                if ($start->diffInDays($end) > 30) {
                    $validator->errors()->add('date_max', 'Observe intervalos de até 30 dias por vez para manter o observatório responsivo.');
                }
            }

            if (! $this->filled('dist_max')) {
                return;
            }

            $distance = strtoupper((string) $this->input('dist_max'));
            $numeric = (float) str_replace('LD', '', $distance);
            $limit = str_ends_with($distance, 'LD') ? 100.0 : 1.0;

            if ($numeric <= 0 || $numeric > $limit) {
                $validator->errors()->add('dist_max', 'Use uma distância positiva de até 1 au ou até 100LD.');
            }
        });
    }

    public function filters(array $defaults): array
    {
        return [
            'date_min' => $this->input('date_min', $defaults['date_min']),
            'date_max' => $this->input('date_max', $defaults['date_max']),
            'type' => $this->input('type', $defaults['type']),
            'dist_max' => $this->input('dist_max', $defaults['dist_max']),
            'sort' => $this->input('sort', $defaults['sort']),
            'distance_unit' => $this->input('distance_unit', $defaults['distance_unit']),
        ];
    }

    public function messages(): array
    {
        return [
            'date_min.date_format' => 'Use a data inicial no formato AAAA-MM-DD.',
            'date_max.date_format' => 'Use a data final no formato AAAA-MM-DD.',
            'date_max.after_or_equal' => 'A data final deve ser igual ou posterior à data inicial.',
            'type.in' => 'Escolha todos, asteroides ou cometas.',
            'dist_max.regex' => 'Use distância em au, como 0.2, ou em distâncias lunares, como 10LD.',
            'sort.in' => 'Escolha uma ordenação reconhecida pelo observatório.',
            'distance_unit.in' => 'Escolha quilômetros ou milhas.',
        ];
    }
}
