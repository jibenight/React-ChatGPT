import { Fragment, useEffect, useMemo, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import chatGPT from '../../assets/chatGPT.mp4';
import code from '../../assets/code.mp4';
import grammar from '../../assets/grammar.mp4';
import sqlTranslate from '../../assets/sql-translate.mp4';
import helperJs from '../../assets/helper-js.mp4';

const providers = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'gpt-4o par défaut',
    avatar: chatGPT,
    models: [
      { id: 'gpt-4o', label: 'gpt-4o' },
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini' },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Modèles Google Gemini 1.5',
    avatar: helperJs,
    models: [
      { id: 'gemini-1.5-pro', label: 'gemini-1.5-pro' },
      { id: 'gemini-1.5-flash', label: 'gemini-1.5-flash' },
    ],
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Modèles Anthropic Claude 3.5',
    avatar: code,
    models: [
      { id: 'claude-3-5-sonnet-20240620', label: 'claude-3.5-sonnet' },
      { id: 'claude-3-opus-20240229', label: 'claude-3-opus' },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    description: 'Modèles Mistral Large',
    avatar: grammar,
    models: [
      { id: 'mistral-large-latest', label: 'mistral-large' },
      { id: 'mistral-small-latest', label: 'mistral-small' },
    ],
  },
  {
    id: 'sql-helper',
    name: 'SQL helper',
    description: 'Prompt SQL (OpenAI)',
    avatar: sqlTranslate,
    models: [{ id: 'gpt-4o-mini', label: 'gpt-4o-mini' }],
    provider: 'openai',
  },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Aioption({ selectedOption, setSelectedOption }) {
  const defaultProvider = providers[0];
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);
  const [selectedModel, setSelectedModel] = useState(defaultProvider.models[0]);

  useEffect(() => {
    // Hydrate from parent selection if provided
    if (selectedOption?.provider) {
      const provider =
        providers.find(
          p =>
            p.id === selectedOption.provider ||
            p.provider === selectedOption.provider,
        ) || defaultProvider;
      const model =
        provider.models.find(m => m.id === selectedOption.model) ||
        provider.models[0];
      setSelectedProvider(provider);
      setSelectedModel(model);
    } else if (setSelectedOption) {
      // Push defaults upward on first render if parent has nothing
      setSelectedOption({
        provider: defaultProvider.id,
        model: defaultProvider.models[0].id,
        name: `${defaultProvider.name} – ${defaultProvider.models[0].label}`,
        avatar: defaultProvider.avatar,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption]);

  useEffect(() => {
    if (!setSelectedOption) return;
    setSelectedOption({
      provider: selectedProvider.provider || selectedProvider.id,
      model: selectedModel.id,
      name: `${selectedProvider.name} – ${selectedModel.label}`,
      avatar: selectedProvider.avatar,
    });
  }, [selectedProvider, selectedModel, setSelectedOption]);

  const modelsForProvider = useMemo(
    () => selectedProvider.models || [],
    [selectedProvider],
  );

  return (
    <div className='space-y-4'>
      <div>
        <Listbox
          value={selectedProvider}
          onChange={provider => {
            setSelectedProvider(provider);
            setSelectedModel(provider.models[0]);
          }}
        >
          {({ open }) => (
            <>
              <Listbox.Label className='block text-sm font-medium leading-6 text-gray-200'>
                Choisir le fournisseur
              </Listbox.Label>
              <div className='relative mt-2'>
                <Listbox.Button className='relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm sm:leading-6'>
                  <span className='flex items-center'>
                    <video
                      src={selectedProvider.avatar}
                      alt=''
                      className='h-5 w-5 flex-shrink-0 rounded-full'
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                    <span className='ml-3 block truncate'>
                      {selectedProvider.name}
                    </span>
                  </span>
                  <span className='pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2'>
                    <ChevronUpDownIcon
                      className='h-5 w-5 text-gray-400'
                      aria-hidden='true'
                    />
                  </span>
                </Listbox.Button>

                <Transition
                  show={open}
                  as={Fragment}
                  leave='transition ease-in duration-100'
                  leaveFrom='opacity-100'
                  leaveTo='opacity-0'
                >
                  <Listbox.Options className='absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm'>
                    {providers.map(option => (
                      <Listbox.Option
                        key={option.id}
                        className={({ active }) =>
                          classNames(
                            active ? 'bg-teal-500 text-white' : 'text-gray-900',
                            'relative cursor-default select-none py-2 pl-3 pr-9',
                          )
                        }
                        value={option}
                      >
                        {({ selected }) => (
                          <>
                            <div className='flex items-center'>
                              <video
                                src={option.avatar}
                                alt=''
                                className='h-5 w-5 flex-shrink-0 rounded-full'
                                autoPlay
                                muted
                                loop
                                playsInline
                              />
                              <span
                                className={classNames(
                                  selected ? 'font-semibold' : 'font-normal',
                                  'ml-3 block truncate',
                                )}
                              >
                                {option.name}
                              </span>
                            </div>

                            {selected ? (
                              <span className='text-teal-600 absolute inset-y-0 right-0 flex items-center pr-4'>
                                <CheckIcon
                                  className='h-5 w-5'
                                  aria-hidden='true'
                                />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </>
          )}
        </Listbox>
        <p className='text-white mt-2 text-sm'>
          {selectedProvider.description}
        </p>
      </div>

      <div>
        <Listbox value={selectedModel} onChange={setSelectedModel}>
          {({ open }) => (
            <>
              <Listbox.Label className='block text-sm font-medium leading-6 text-gray-200'>
                Choisir le modèle
              </Listbox.Label>
              <div className='relative mt-2'>
                <Listbox.Button className='relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm sm:leading-6'>
                  <span className='flex items-center'>
                    <span className='ml-1 block truncate'>
                      {selectedModel.label}
                    </span>
                  </span>
                  <span className='pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2'>
                    <ChevronUpDownIcon
                      className='h-5 w-5 text-gray-400'
                      aria-hidden='true'
                    />
                  </span>
                </Listbox.Button>

                <Transition
                  show={open}
                  as={Fragment}
                  leave='transition ease-in duration-100'
                  leaveFrom='opacity-100'
                  leaveTo='opacity-0'
                >
                  <Listbox.Options className='absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm'>
                    {modelsForProvider.map(model => (
                      <Listbox.Option
                        key={model.id}
                        className={({ active }) =>
                          classNames(
                            active ? 'bg-teal-500 text-white' : 'text-gray-900',
                            'relative cursor-default select-none py-2 pl-3 pr-9',
                          )
                        }
                        value={model}
                      >
                        {({ selected }) => (
                          <>
                            <div className='flex items-center'>
                              <span
                                className={classNames(
                                  selected ? 'font-semibold' : 'font-normal',
                                  'ml-1 block truncate',
                                )}
                              >
                                {model.label}
                              </span>
                            </div>

                            {selected ? (
                              <span className='text-teal-600 absolute inset-y-0 right-0 flex items-center pr-4'>
                                <CheckIcon
                                  className='h-5 w-5'
                                  aria-hidden='true'
                                />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </>
          )}
        </Listbox>
      </div>
    </div>
  );
}
