import { Fragment, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import chatGPT from '../assets/chatGPT.webp';
import code from '../assets/code.gif';
import grammar from '../assets/grammar.gif';
import sqlTranslate from '../assets/sql-translate.gif';
import helperJs from '../assets/helper-js.gif';

const robot = [
  {
    id: 1,
    name: 'ChatGPT',
    description: 'Open ended conversation with an AI assistant',
    avatar: chatGPT,
  },
  {
    id: 2,
    name: 'Explain code',
    description: 'Explain code and get feedback',
    avatar: code,
  },
  {
    id: 3,
    name: 'Grammar correction',
    description: 'Corrects sentences into standard English.',
    avatar: grammar,
  },
  {
    id: 4,
    name: 'SQL translate',
    description: 'Translate natural language to SQL queries.',
    avatar: sqlTranslate,
  },
  {
    id: 5,
    name: 'JavaScript helper',
    description:
      'This is a message-style chatbot that can answer questions about using JavaScript. It uses a few examples to get the conversation started.',
    avatar: helperJs,
  },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Aioption(props) {
  const [selected, setSelected] = useState(robot[0]);

  function handleSelectOption(option) {
    setSelected(option);
    props.setSelectedOption(option);
  }

  return (
    <div>
      <Listbox value={selected} onChange={handleSelectOption}>
        {({ open }) => (
          <>
            <Listbox.Label className='block text-sm font-medium leading-6 text-gray-200'>
              Choose your AI modele :
            </Listbox.Label>
            <div className='relative mt-2'>
              <Listbox.Button className='relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm sm:leading-6'>
                <span className='flex items-center'>
                  <img
                    src={selected.avatar}
                    alt=''
                    className='h-5 w-5 flex-shrink-0 rounded-full'
                  />
                  <span className='ml-3 block truncate'>{selected.name}</span>
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
                  {robot.map(person => (
                    <Listbox.Option
                      key={person.id}
                      className={({ active }) =>
                        classNames(
                          active ? 'bg-teal-600 text-white' : 'text-gray-900',
                          'relative cursor-default select-none py-2 pl-3 pr-9'
                        )
                      }
                      value={person}
                    >
                      {({ selected, active }) => (
                        <>
                          <div className='flex items-center'>
                            <img
                              src={person.avatar}
                              alt=''
                              className='h-5 w-5 flex-shrink-0 rounded-full'
                            />
                            <span
                              className={classNames(
                                selected ? 'font-semibold' : 'font-normal',
                                'ml-3 block truncate'
                              )}
                            >
                              {person.name}
                            </span>
                          </div>

                          {selected ? (
                            <span
                              className={classNames(
                                active ? 'text-white' : 'text-teal-600',
                                'absolute inset-y-0 right-0 flex items-center pr-4'
                              )}
                            >
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
      <p className='text-white mt-2'>{selected.description}</p>
    </div>
  );
}
