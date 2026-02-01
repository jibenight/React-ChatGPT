import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Dropdown() {
  return (
    <Menu as='div' className='relative inline-block text-center p-2 w-full'>
      <div>
        <Menu.Button className='inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800'>
          Options
          <ChevronDownIcon
            className='-mr-1 h-5 w-5 text-gray-400 dark:text-slate-400'
            aria-hidden='true'
          />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter='transition ease-out duration-100'
        enterFrom='transform opacity-0 scale-95'
        enterTo='transform opacity-100 scale-100'
        leave='transition ease-in duration-75'
        leaveFrom='transform opacity-100 scale-100'
        leaveTo='transform opacity-0 scale-95'
      >
        <Menu.Items className='absolute left-1/2 transform -translate-x-1/2 z-10 mt-2 w-4/5 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-slate-900 dark:ring-slate-700'>
          <div className='py-1'>
            <Menu.Item>
              {({ active }) => (
                <button
                  type='button'
                  className={classNames(
                    active
                      ? 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-slate-100'
                      : 'text-gray-700 dark:text-slate-300',
                    'block w-full px-4 py-2 text-left text-sm'
                  )}
                >
                  Paramètres du compte
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  type='button'
                  className={classNames(
                    active
                      ? 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-slate-100'
                      : 'text-gray-700 dark:text-slate-300',
                    'block w-full px-4 py-2 text-left text-sm'
                  )}
                >
                  Support
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  type='button'
                  className={classNames(
                    active
                      ? 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-slate-100'
                      : 'text-gray-700 dark:text-slate-300',
                    'block w-full px-4 py-2 text-left text-sm'
                  )}
                >
                  Licence
                </button>
              )}
            </Menu.Item>
            <form method='POST' action='#'>
              <Menu.Item>
                {({ active }) => (
                  <button
                    type='submit'
                    className={classNames(
                    active
                      ? 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-slate-100'
                      : 'text-gray-700 dark:text-slate-300',
                      'block w-full px-4 py-2 text-left text-sm'
                    )}
                  >
                    Déconnexion
                  </button>
                )}
              </Menu.Item>
            </form>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
